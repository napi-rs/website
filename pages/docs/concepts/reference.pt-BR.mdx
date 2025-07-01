---
description: Create and use Object References.
---

# `Reference` / `WeakReference`

## `Reference`

Em alguns cenários, você pode querer manter uma referência a um `Object` criado em `Rust`. Por exemplo:

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

A struct `Repository` abaixo é fácil de criar uma Classe `#[napi]` ao redor dela, porque não contém nenhum **lifetime** na definição.

Mas a struct `Remote<'repo>` não poderia ser criada uma Classe `#[napi]` ao redor dela, porque existe o lifetime `'repo` nela.

Com a API de `Reference` você pode criar uma struct com o lifetime `'static`, o que significa que a struct criada viverá enquanto você puder acessá-la em seu código `Rust`.

Assim como o [`Env`](./inject-env) e o [`This`](./inject-this), o `Reference` é injetado nos parâmetros das funções `#[napi]`.

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

Como você pode ver, o `Reference<JsRepo>` injetado possui a função `share_with` nele, que pode ser usada para criar uma estrutura `JsRepo` com tempo de vida `'static` no fechamento.

![](/assets/reference.svg)

O `Reference` criado fará com que o Node.js mantenha a instância `JsRepo` até que todas as referências sejam descartadas.

## `WeakReference`

`WeakReference` é muito útil quando você está criando referências circulares.

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

No exemplo acima, a struct `CSSRuleList` é criada com uma `WeakReference<CSSStyleSheet>` como seu campo `parent`.
Como o `CSSRuleList` é criado pelo `CSSStyleSheet` neste caso, a instância `CSSStyleSheet` é uma referência circular para a instância `CSSRuleList` que criou.

A `WeakReference` não aumentará a contagem de referência do objeto bruto, então o método `upgrade` de `WeakReference` pode retornar `None` se o objeto bruto for descartado.
