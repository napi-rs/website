---
title: 'Reference / WeakReference'
description: Crie e use referências a objetos JavaScript.
---

# `Reference` / `WeakReference`

## `Reference`

Em alguns cenários, você pode querer manter uma referência a um `Object` criado em `Rust`. Por exemplo:

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

A struct `Repository` abaixo é fácil de criar uma Classe `#[napi]` ao redor dela, porque não contém nenhum **lifetime** na definição.

Mas a struct `Remote<'repo>` não poderia ser criada uma Classe `#[napi]` ao redor dela, porque existe o lifetime `'repo` nela.

Com a API de `Reference` você pode criar uma struct com o lifetime `'static`, o que significa que a struct criada viverá enquanto você puder acessá-la em seu código `Rust`.

Assim como o [`Env`](./inject-env) e o [`This`](./inject-this), o `Reference` é injetado nos parâmetros das funções `#[napi]`.

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

Como você pode ver, o `Reference<JsRepo>` injetado possui a função `share_with` nele, que pode ser usada para criar uma estrutura `JsRepo` com tempo de vida `'static` no fechamento.

![](/assets/reference.svg)

O `Reference` criado fará com que o Node.js mantenha a instância `JsRepo` até que todas as referências sejam descartadas.

## `WeakReference`

`WeakReference` é muito útil quando você está criando referências circulares.

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

No exemplo acima, a struct `CSSRuleList` é criada com uma `WeakReference<CSSStyleSheet>` como seu campo `parent`.
Como o `CSSRuleList` é criado pelo `CSSStyleSheet` neste caso, a instância `CSSStyleSheet` é uma referência circular para a instância `CSSRuleList` que criou.

A `WeakReference` não aumentará a contagem de referência do objeto bruto, então o método `upgrade` de `WeakReference` pode retornar `None` se o objeto bruto for descartado.

## Referência de valores JavaScript {#javascript-value-reference}

### `ObjectRef`

::: warning
Um `ObjectRef` com posse deve ser retornado ao JavaScript ou consumido por
`unref`. Descartá-lo apenas reporta um vazamento; sem um `Env` ele não
consegue deletar a referência Node-API, então o objeto permanece fortemente
referenciado.

:::

No exemplo abaixo, criamos o `ObjectRef` no construtor e o usamos depois no método `getOptions`.

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
Um `SymbolRef` com posse deve ser retornado ao JavaScript ou consumido por
`unref`. Descartá-lo apenas reporta um vazamento; sem um `Env` ele não
consegue deletar a referência Node-API, então o símbolo permanece fortemente
referenciado.

:::

A API do `SymbolRef` é basicamente a mesma do `ObjectRef`.

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
`FunctionRef` é `Send + Sync`, mas o `Function` emprestado a partir dele está
vinculado ao `Env` fornecido a `borrow_back`. Mover a referência não a torna
válida para chamar JavaScript a partir de uma thread arbitrária; empreste-o e
chame-o apenas em uma thread onde aquele ambiente possa ser usado.

:::

O `FunctionRef` pode ser criado diretamente no `Function`.

No exemplo abaixo, se você tentar chamar `Function` no callback do `Promise.finally`, você encontrará um erro de lifetime:

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

Você pode criar o `FunctionRef` e pegar o `Function` emprestado de volta a partir dele mais tarde:

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
O `ExternalRef` não é `Send` porque ele precisa ser descartado na mesma thread
em que o `ExternalRef` é criado.

:::

O `ExternalRef` mantém o [`napi_ref`](https://nodejs.org/api/n-api.html#napi_ref) para o objeto criado pela função [`napi_create_external`](https://nodejs.org/api/n-api.html#napi_create_external).

É basicamente a mesma coisa que a API do `ObjectRef`:

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
