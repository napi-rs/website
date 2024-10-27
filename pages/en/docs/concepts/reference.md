---
description: Create and use Object References.
---

# `Reference` / `WeakReference`

## `Reference`

In some scenarios, you may want to hold a reference to an `Object` created in `Rust`. For example:

```rust {11} filename="lib.rs"
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

The `Repository` struct below is easy to create `#[napi]` Class around it, because it doesn't contains any **lifetime** in the definition.

But the `Remote<'repo>` struct could not be created `#[napi]` Class around it, because there is `'repo` lifetime on it.

With `Reference` API, you can create a `'static` lifetime struct, which means the created struct will life as long as you can access it in your `Rust` code.

Like the [`Env`](./inject-env) and [`This`](./inject-this), the `Reference` is injected into parameters of `#[napi]` functions.

```rust {37-42,45-48} filename="lib.rs"
use napi::bindgen_prelude::*;

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

![](/assets/reference.svg)

The created `Reference` will make the Node.js to hold the `JsRepo` instance until all the references are dropped.

## `WeakReference`

`WeakReference` is very useful when you are creating circular references.

```rust {13,24,71} filename="lib.rs"
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
  inner: OwnedStyleSheet,
  rules: Option<Reference<CSSRuleList>>,
}

#[napi]
impl CSSStyleSheet {
  #[napi(constructor)]
  pub fn new(name: String, rules: Vec<String>) -> Result<Self> {
    let inner = OwnedStyleSheet { rules };
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

In the example above, the `CSSRuleList` struct is created with a `WeakReference<CSSStyleSheet>` as its `parent` field. Because the `CSSRuleList` is created by the `CSSStyleSheet` in this case, the `CSSStyleSheet` instance is circular reference to the `CSSRuleList` instance it created.

The `WeakReference` will not increase the reference count of the raw Object, so the `upgrade` fn of `WeakReference` may return `None` if the raw Object is dropped.
