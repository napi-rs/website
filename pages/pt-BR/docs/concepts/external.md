---
title: 'External'
description: Armazene um valor nativo em um objeto External do JavaScript.
---

# External

[`External`](https://nodejs.org/api/n-api.html#napi_create_external) é muito semelhante ao [`Object Wrap`](https://nodejs.org/api/n-api.html#object-wrap), que é usado em [Class](./class) por de baixo dos panos.

`Object Wrap` anexa um valor nativo a um objeto JavaScript e pode notificá-lo quando o objeto JavaScript anexado é reciclado pelo GC. `External` cria um objeto JavaScript vazio que mantém o valor nativo nos bastidores. Ele só funciona passando o objeto de volta para Rust:

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
fn create_source_map(length: u32) -> External<Buffer> {
  External::new(vec![0; length as usize].into())
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts
export class ExternalObject<T> {
  readonly '': {
    readonly '': unique symbol
    [K: symbol]: T
  }
}

export function createSourceMap(length: number): ExternalObject<Buffer>
```

`External` é muito útil quando você deseja retornar um objeto JavaScript com alguns métodos nele para interagir com o código nativo Rust.
Aqui está um exemplo do mundo real:

https://github.com/h-a-n-a/magic-string-rs/blob/v0.3.0/node/src/lib.rs#L96-L103

https://github.com/h-a-n-a/magic-string-rs/blob/v0.3.0/node/index.js#L7-L23

**lib.rs**

```rust
impl MagicString {
  #[napi(ts_return_type = "{ toString: () => string, toUrl: () => string }")]
  pub fn generate_map(
    &mut self,
    options: Option<magic_string::GenerateDecodedMapOptions>,
  ) -> Result<External<SourceMap>> {
    let external = create_external(self.0.generate_map(options.unwrap_or_default())?);
    Ok(external)
  }

  /// @internal
  #[napi]
  pub fn to_sourcemap_string(&mut self, sourcemap: External<SourceMap>) -> Result<String> {
    Ok((*sourcemap.as_ref()).to_string()?)
  }

  /// @internal
  #[napi]
  pub fn to_sourcemap_url(&mut self, sourcemap: External<SourceMap>) -> Result<String> {
    Ok((*sourcemap.as_ref()).to_url()?)
  }
}
```

Primeiro, o método `generate_map` retorna um objeto `External`, e então a função JavaScript mantém o objeto `External` no fechamento:

**index.js**

```ts
module.exports.MagicString = class MagicString extends MagicStringNative {
  generateMap(options) {
    const sourcemap = super.generateMap({
      file: null,
      source: null,
      sourceRoot: null,
      includeContent: false,
      ...options,
    })

    const toString = () => super.toSourcemapString(sourcemap)
    const toUrl = () => super.toSourcemapUrl(sourcemap)

    return {
      toString,
      toUrl,
    }
  }
}
```
