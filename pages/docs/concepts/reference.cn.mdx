---
description: 创建、使用对象引用。
---

# `Reference` / `WeakReference`

## `Reference`

In some scenarios, you may want to hold a reference to an `Object` created in `Rust`. For example:
在某些场景下，您可能希望保存一个 `Rust` 创建的 `Object` 的引用，例如：

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

`Repository` 结构体很容易围绕其创建 `#[napi]` 类，因为它的定义中没有包含任何**生命周期**。

但是 `Remote<'repo>` 结构体无法对其创建 `#[napi]` 类，因为它有 `'repo` 生命周期。

通过 `Reference` API，您可以创建一个 `'static` 生命周期的结构体，这意味着只要您能在 `Rust` 代码中访问到它，创建的结构体就一直存在。

与 [`Env`](./inject-env) 和 [`This`](./inject-this) 一样，`Reference` 会被注入到 `#[napi]` 函数的参数中。

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

如您所见，注入的 `Reference<JsRepo>` 上具有 `share_with` 函数，可用于在闭包中创建一个 `'static` 生命周期的 `JsRepo` 结构体。

![](/assets/reference.svg)

创建的 `Reference` 将使 Node.js 保持 `JsRepo` 实例，直到所有引用都被释放。

## `WeakReference`

当您创建循环引用时，`WeakReference` 非常有用。

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

在上面的示例中，`CSSRuleList` 结构体中字段 `parent` 的类型是 `WeakReference<CSSStyleSheet>` ，
因为本例中 `CSSRuleList` 是由 `CSSStyleSheet` 创建的，所以 `CSSStyleSheet` 实例是对其创建的 `CSSRuleList` 实例的循环引用。

`WeakReference` 不会增加原始对象的引用计数，因此如果原始对象被释放， `WeakReference` 的 `upgrade` 函数可能会返回 `None`。
