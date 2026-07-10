---
title: 'Reference / WeakReference'
description: 创建、使用对象引用。
---

# `Reference` / `WeakReference`

## `Reference`

在某些场景下，您可能希望保存一个 `Rust` 创建的 `Object` 的引用，例如：

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

`Repository` 结构体很容易围绕其创建 `#[napi]` 类，因为它的定义中没有包含任何**生命周期**。

但是 `Remote<'repo>` 结构体无法对其创建 `#[napi]` 类，因为它有 `'repo` 生命周期。

通过 `Reference` API，您可以创建一个 `'static` 生命周期的结构体，这意味着只要您能在 `Rust` 代码中访问到它，创建的结构体就一直存在。

与 [`Env`](./inject-env) 和 [`This`](./inject-this) 一样，`Reference` 会被注入到 `#[napi]` 函数的参数中。

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

如您所见，注入的 `Reference<JsRepo>` 上具有 `share_with` 函数，可用于在闭包中创建一个 `'static` 生命周期的 `JsRepo` 结构体。

![](/assets/reference.svg)

创建的 `Reference` 将使 Node.js 保持 `JsRepo` 实例，直到所有引用都被释放。

## `WeakReference`

当您创建循环引用时，`WeakReference` 非常有用。

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

在上面的示例中，`CSSRuleList` 结构体中字段 `parent` 的类型是 `WeakReference<CSSStyleSheet>` ，
因为本例中 `CSSRuleList` 是由 `CSSStyleSheet` 创建的，所以 `CSSStyleSheet` 实例是对其创建的 `CSSRuleList` 实例的循环引用。

`WeakReference` 不会增加原始对象的引用计数，因此如果原始对象被释放， `WeakReference` 的 `upgrade` 函数可能会返回 `None`。

## JavaScript 值引用 {#javascript-value-reference}

### `ObjectRef`

::: warning
一个拥有所有权的 `ObjectRef` 必须被返回给 JavaScript，或者通过 `unref`
消费掉。直接将其丢弃只会报告一次泄漏；在没有 `Env` 的情况下它无法删除
Node-API 引用，因此该对象仍然会被强引用。

:::

在下面的示例中，我们在构造函数中创建 `ObjectRef`，并在之后的 `getOptions` 方法中使用它。

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
一个拥有所有权的 `SymbolRef` 必须被返回给 JavaScript，或者通过 `unref`
消费掉。直接将其丢弃只会报告一次泄漏；在没有 `Env` 的情况下它无法删除
Node-API 引用，因此该 Symbol 仍然会被强引用。

:::

`SymbolRef` 的 API 与 `ObjectRef` 基本相同。

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
`FunctionRef` 是 `Send + Sync` 的，但从中借出的 `Function` 与传给
`borrow_back` 的 `Env` 绑定。移动该引用并不会让它可以从任意线程调用
JavaScript；只能在允许使用该环境的线程上借出并调用它。

:::

`FunctionRef` 可以直接在 `Function` 上创建。

在下面的示例中，如果您试图在 `Promise.finally` 回调中调用 `Function`，将会遇到一个生命周期错误：

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

您可以创建 `FunctionRef`，然后在之后从中借回 `Function`：

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
`ExternalRef` 不是 `Send` 的，因为它需要在创建 `ExternalRef` 的同一线程中被丢弃。

:::

`ExternalRef` 持有指向由 [`napi_create_external`](https://nodejs.org/api/n-api.html#napi_create_external) 函数所创建对象的 [`napi_ref`](https://nodejs.org/api/n-api.html#napi_ref)。

它与 `ObjectRef` API 基本相同：

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
