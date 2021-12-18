---
title: 'External'
description: External Object holds the native value with a JavaScript Object.
---

[`External`](https://nodejs.org/api/n-api.html#napi_create_external) is very similar to [`Object Wrap`](https://nodejs.org/api/n-api.html#object-wrap), which is used in [Class](./class) under the hood.

`Object Wrap` attaches a native value to a JavaScript Object and can notify you when the attached JavaScript Object is recycled by GC. `External` creates an empty, blank JavaScript Object which holds the native value under the hood. It only works by passing the object back to Rust:

```rust title=lib.rs
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
fn create_source_map(length: u32) -> External<Buffer> {
  External::new(vec![0; length as usize].into())
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export class ExternalObject<T> {
  readonly '': {
    readonly '': unique symbol
    [K: symbol]: T
  }
}

export function createSourceMap(length: number): ExternalObject<Buffer>
```

`External` is very useful when you want to return a JavaScript Object with some methods on it to interact with the native Rust code.

Here is an real world example:

https://github.com/h-a-n-a/magic-string-rs/blob/main/node/src/lib.rs#L101

https://github.com/h-a-n-a/magic-string-rs/blob/main/node/index.js#L7-L23

```rust title=lib.rs
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

First the `generate_map` method returns an `External` object, and then the JavaScript function holds the `External` object in closure:

```ts title=index.js
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
