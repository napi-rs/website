---
title: Reference
description: Create and use Object References.
---

# `Reference` / `WeakReference`

In some scenarios, you may want to extend the lifetime of the `Object` to the `Rust` side. You can use `Reference` to hold a reference to this object.

::: warning
Both the `Reference` and `WeakReference` are not `Send`, because of the `drop`
of the `Reference` must be called in the same thread as the `Reference` is
created.

:::

## `Reference`

`Reference` is a wrapper of the [`napi_ref`](https://nodejs.org/api/n-api.html#napi_ref).

::: info
NAPI-RS calls the [`napi_wrap`](https://nodejs.org/api/n-api.html#napi_wrap) function to wrap the Rust `struct` with the class instance object when creating the class instance. There is a [`napi_ref`](https://nodejs.org/api/n-api.html#napi_ref) that is created by the `napi_wrap`. `Reference` holds the `napi_ref` so you can always access the underlying `struct` reference before the underlying `napi_ref` is deleted.

:::

For example:

**lib.rs**

```rust {11}
pub struct Repository {
  dir: String,
}

impl Repository {
  fn remote(&self) -> Remote {
    Remote { inner: self }
  }
}

pub struct Remote<'repo> {
  inner: &'repo Repository,
}

impl<'repo> Remote<'repo> {
  fn name(&self) -> String {
    "origin".to_owned()
  }
}
```

The `Repository` struct below is easy to create a `#[napi]` Class around, because it doesn't contain any **lifetime** in the definition.

However, the `Remote<'repo>` struct cannot have a `#[napi]` Class created around it, because it has a `'repo` lifetime.

With the `Reference` API, you can create a `'static` lifetime struct, which means the created struct will live as long as you can access it in your `Rust` code.

Like the [`Env`](./inject-env) and [`This`](./inject-this), the `Reference` is injected into parameters of `#[napi]` functions.

**lib.rs**

```rust {37-42,45-48}
use napi::bindgen_prelude::*;
use napi_derive::napi;

pub struct Repository {
  dir: String,
}

impl Repository {
  fn remote(&self) -> Remote {
    Remote { inner: self }
  }
}

pub struct Remote<'repo> {
  inner: &'repo Repository,
}

impl<'repo> Remote<'repo> {
  fn name(&self) -> String {
    "origin".to_owned()
  }
}

#[napi]
pub struct JsRepo {
  inner: Repository,
}

#[napi]
impl JsRepo {
  #[napi(constructor)]
  pub fn new(dir: String) -> Self {
    JsRepo {
      inner: Repository { dir },
    }
  }

  #[napi]
  pub fn remote(&self, reference: Reference<JsRepo>, env: Env) -> Result<JsRemote> {
    Ok(JsRemote {
      inner: reference.share_with(env, |repo| Ok(repo.inner.remote()))?,
    })
  }
}

#[napi]
pub struct JsRemote {
  inner: SharedReference<JsRepo, Remote<'static>>,
}

#[napi]
impl JsRemote {
  #[napi]
  pub fn name(&self) -> String {
    self.inner.name()
  }
}
```

As you can see, the injected `Reference<JsRepo>` has the `share_with` fn on it, which can be used to create a `'static` lifetime `JsRepo` struct in the closure.

![reference lifetime diagram](/assets/reference.svg)

The created `Reference` will make Node.js hold the `JsRepo` instance until all the references are dropped.

## `WeakReference`

`WeakReference` is very useful when you are creating circular references.

**lib.rs**

```rust {13,24,71}
use std::{cell::RefCell, rc::Rc};

use napi::bindgen_prelude::*;
use napi_derive::napi;

pub struct OwnedStyleSheet {
  rules: Vec<String>,
}

#[napi]
pub struct CSSRuleList {
  owned: Rc<RefCell<OwnedStyleSheet>>,
  parent: WeakReference<CSSStyleSheet>,
}

#[napi]
impl CSSRuleList {
  #[napi]
  pub fn get_rules(&self) -> Vec<String> {
    self.owned.borrow().rules.to_vec()
  }

  #[napi(getter)]
  pub fn parent_style_sheet(&self) -> WeakReference<CSSStyleSheet> {
    self.parent.clone()
  }

  #[napi(getter)]
  pub fn name(&self, env: Env) -> Result<Option<String>> {
    Ok(
      self
        .parent
        .upgrade(env)?
        .map(|stylesheet| stylesheet.name.clone()),
    )
  }
}

#[napi]
pub struct CSSStyleSheet {
  name: String,
  inner: Rc<RefCell<OwnedStyleSheet>>,
  rules: Option<Reference<CSSRuleList>>,
}

#[napi]
impl CSSStyleSheet {
  #[napi(constructor)]
  pub fn new(name: String, rules: Vec<String>) -> Result<Self> {
    let inner = Rc::new(RefCell::new(OwnedStyleSheet { rules }));
    Ok(CSSStyleSheet {
      name,
      inner,
      rules: None,
    })
  }

  #[napi(getter)]
  pub fn rules(
    &mut self,
    env: Env,
    reference: Reference<CSSStyleSheet>,
  ) -> Result<Reference<CSSRuleList>> {
    if let Some(rules) = &self.rules {
      return rules.clone(env);
    }

    let rules = CSSRuleList::into_reference(
      CSSRuleList {
        owned: self.inner.clone(),
        parent: reference.downgrade(),
      },
      env,
    )?;

    self.rules = Some(rules.clone(env)?);
    Ok(rules)
  }
}
```

In the example above, the `CSSRuleList` struct is created with a `WeakReference<CSSStyleSheet>` as its `parent` field. Because the `CSSRuleList` is created by the `CSSStyleSheet` in this case, the `CSSStyleSheet` instance is a circular reference to the `CSSRuleList` instance it created.

The `WeakReference` will not increase the reference count of the raw Object, so the `upgrade` function of `WeakReference` may return `None` if the raw Object is dropped.

## JavaScript Value Reference

### `ObjectRef`

::: warning
An owned `ObjectRef` must either be returned to JavaScript or be consumed by
`unref`. Dropping it only reports a leak; it cannot delete the Node-API
reference without an `Env`, so the object remains strongly referenced.

:::

In the example below, we create the `ObjectRef` in the constructor and use it later in the `getOptions` method.

**lib.rs**

```rust {14}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub struct NativeClass {
  options: Option<ObjectRef>,
}

#[napi]
impl NativeClass {
  #[napi(constructor)]
  pub fn new(options: Object) -> Result<Self> {
    Ok(Self {
      options: Some(options.create_ref()?),
    })
  }

  #[napi]
  pub fn get_options<'env>(&self, env: &'env Env) -> Result<Object<'env>> {
    self
      .options
      .as_ref()
      .ok_or_else(|| Error::from_reason("options were released"))?
      .get_value(env)
  }

  #[napi]
  pub fn release_options(&mut self, env: &Env) -> Result<()> {
    if let Some(options) = self.options.take() {
      options.unref(env)?;
    }
    Ok(())
  }
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.ts**

```ts
import { NativeClass } from './index.js'

const nativeClass = new NativeClass({
  name: 'John',
  age: 30,
})

const options = nativeClass.getOptions() // { name: 'John', age: 30 }
nativeClass.releaseOptions()
```

### `SymbolRef`

::: warning
An owned `SymbolRef` must either be returned to JavaScript or be consumed by
`unref`. Dropping it only reports a leak; it cannot delete the Node-API
reference without an `Env`, so the symbol remains strongly referenced.

:::

The `SymbolRef` API is basically the same as the `ObjectRef`.

**lib.rs**

```rust
use napi::{SymbolRef, bindgen_prelude::*};
use napi_derive::napi;

#[napi]
pub fn create_symbol_ref(env: &Env) -> Result<SymbolRef> {
  Symbol::new("NAPI_RS_SYMBOL")
    .into_js_symbol(env)?
    .create_ref()
}
```

### `FunctionRef`

::: info
`FunctionRef` is `Send + Sync`, but the `Function` borrowed from it is tied
to the `Env` supplied to `borrow_back`. Moving the reference does not make it
valid to call JavaScript from an arbitrary thread; borrow and call it only on
a thread where that environment may be used.

:::

`FunctionRef` can be created on the `Function` directly.

In the example below, if you try to call `Function` in the `Promise.finally` callback, you will encounter a lifetime error:

**lib.rs**

```rust {15}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn promise_finally_callback(
  mut promise: PromiseRaw<()>,
  on_finally: Function<()>,
) -> Result<()> {
  // ❌ compile Error
  // borrowed data escapes outside of function
  // `on_finally` escapes the function body here
  // lib.rs(7, 3): `on_finally` is a reference that is only valid in the function body
  // lib.rs(7, 3): has type `napi::bindgen_prelude::Function<'1, ()>`
  promise.finally(|env| {
    on_finally.call(());
    Ok(())
  })?;
  Ok(())
}
```

You can create the `FunctionRef` and borrow back the `Function` from it later:

**lib.rs**

```rust {11}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn promise_finally_callback(
  mut promise: PromiseRaw<()>,
  on_finally: Function<(), ()>,
) -> Result<()> {
  let on_finally_ref = on_finally.create_ref()?;
  promise.finally(move |env| {
    let on_finally = on_finally_ref.borrow_back(&env)?;
    on_finally.call(())?;
    Ok(())
  })?;
  Ok(())
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.ts**

```ts
import { promiseFinallyCallback } from './index.js'

promiseFinallyCallback(Promise.resolve(), () => {
  console.log('finally')
})
```

### `ExternalRef`

::: info
The `ExternalRef` is not `Send` because it needs to be dropped in the same
thread as the `ExternalRef` is created.

:::

`ExternalRef` holds the [`napi_ref`](https://nodejs.org/api/n-api.html#napi_ref) to the object thats created by the [`napi_create_external`](https://nodejs.org/api/n-api.html#napi_create_external) function.

It's basically the same as the `ObjectRef` API:

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn create_external_ref(env: &Env, size: u32) -> Result<ExternalRef<u32>> {
  let external = External::new(size).into_js_external(env)?;
  external.create_ref()
}
```
