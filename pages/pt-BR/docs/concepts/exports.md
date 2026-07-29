---
title: 'Exportações'
description: Controle como funções, classes e constantes de Rust são exportadas para JavaScript no NAPI-RS.
---

# Exportações

::: info
Ao contrário da definição de módulos no Node.js, não precisamos registrar explicitamente as exportações como `module.exports.xxx = xxx`.

O macro `#[napi]` irá gerar automaticamente o código de registro de módulo para você.
Essa ideia de registro automático foi inspirada pelo [node-bindgen](https://github.com/infinyon/node-bindgen).

:::

## `Function`

Exportar uma função é incrivelmente simples. Basta decorar uma função rust normal com `#[napi]`:

**lib.rs**

```rust
#[napi]
pub fn sum(a: f64, b: f64) -> f64 {
	a + b
}
```

## `Const`

**lib.rs**

```rust
#[napi]
pub const DEFAULT_COST: u32 = 12;
```

**index.d.ts**

```ts
export const DEFAULT_COST: number
```

## `Class`

Veja a [`seção class`](./class) para mais detalhes.

**lib.rs**

```rust
#[napi(constructor)]
pub struct Animal {
  pub name: String,
  pub kind: u32,
}

#[napi]
impl Animal {
  #[napi]
  pub fn change_name(&mut self, new_name: String) {
    self.name = new_name;
  }
}
```

## `Enum`

Veja a [`seção enum`](./enum) para mais detalhes.

**lib.rs**

```rust
#[napi]
pub enum Kind {
  Dog,
  Cat,
  Duck,
}
```

## Objeto `exports`

Você pode usar o atributo `#[napi(module_exports)]` para acessar o objeto `exports`.

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(module_exports)]
pub fn exports(mut export: Object) -> Result<()> {
  let symbol = Symbol::new("NAPI_RS_SYMBOL");
  export.set_named_property("NAPI_RS_SYMBOL", symbol)?;
  Ok(())
}
```

## Namespaces {#namespaces}

Para addons maiores, você pode agrupar exportações relacionadas em objetos de módulo JavaScript aninhados, em vez de achatar tudo no `exports` raiz. Há duas maneiras:

- `#[napi] mod name { ... }` — exporta um módulo Rust inline como um namespace. Cada item filho que também carrega `#[napi]` é exportado dentro dele (módulos napi aninhados não são suportados). Adicione `#[napi(js_name = "...")]` no `mod` para renomear o objeto de namespace.
- `#[napi(namespace = "...")]` em funções, classes, blocos impl, enums, consts e type aliases individuais — registra esse item em `exports.<namespace>`; aplique o mesmo namespace à classe e aos seus blocos `impl`. Veja [`namespace` na referência de atributos](/pt-BR/docs/concepts/napi-attributes#naming-and-exports).

O exemplo canônico é [`examples/napi/src/js_mod.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/js_mod.rs):

**lib.rs**

```rust
#[napi]
mod xxh3 {
  use napi::bindgen_prelude::{BigInt, Buffer};

  #[napi]
  pub const ALIGNMENT: u32 = 16;

  #[napi(js_name = "xxh3_64")]
  pub fn xxh64(input: Buffer) -> u64 {
    let mut h: u64 = 0;
    for i in input.as_ref() {
      h = h.wrapping_add(*i as u64);
    }
    h
  }

  #[napi]
  pub struct Xxh3 {
    inner: BigInt,
  }

  #[napi]
  impl Xxh3 {
    #[napi(constructor)]
    pub fn new() -> Xxh3 {
      // ...
    }
  }
}

#[napi]
mod xxh2 {
  use napi::bindgen_prelude::*;

  #[napi]
  pub fn xxh2_plus(a: u32, b: u32) -> u32 {
    a + b
  }
}
```

Os membros são acessados por meio dos objetos de namespace nas exportações do pacote:

**index.ts**

```ts
import { xxh2, xxh3 } from './index.js'

xxh3.xxh3_64(Buffer.from('hello')) // function renamed with js_name
console.log(xxh3.ALIGNMENT) // 16
const hasher = new xxh3.Xxh3() // classes live inside the namespace too
xxh2.xxh2Plus(1, 2) // 3
```

E o `.d.ts` gerado espelha o aninhamento com `export declare namespace`:

**index.d.ts**

```ts
export declare namespace xxh2 {
  export function xxh2Plus(a: number, b: number): number
}

export declare namespace xxh3 {
  export class Xxh3 {
    constructor()
  }
  export const ALIGNMENT: number
  export function xxh3_64(input: Buffer): bigint
}
```
