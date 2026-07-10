---
title: 'async fn'
description: Execute uma função assíncrona Rust com o runtime Tokio.
---

# async fn

::: tip
Você deve habilitar o recurso **_async_** ou **_tokio_rt_** no `napi` para usar `async fn`:

**Cargo.toml**

```toml {2}
[dependencies]
napi = { version = "3", features = ["async", "tokio_fs"] }
napi-derive = "3"
```

O exemplo abaixo usa a subfeature `tokio_fs`. Habilite somente as APIs Tokio
que o addon realmente usa.

:::

Você pode realizar muitos trabalhos async/multi-threaded com `AsyncTask` e `ThreadsafeFunction`, mas às vezes você pode querer usar diretamente as crates do ecossistema async do Rust.

Com `async` ou `tokio_rt` habilitado, o **NAPI-RS** fornece um runtime Tokio.
Se você aguardar um future Tokio em uma `async fn` exportada, o **NAPI-RS** o
executará nesse runtime e converterá o resultado em uma `Promise` JavaScript.

**lib.rs**

```rust {6}
use napi::bindgen_prelude::*;
use napi::tokio::fs;
use napi_derive::napi;

#[napi]
pub async fn read_file_async(path: String) -> Result<Buffer> {
  let content = fs::read(path).await?;
  Ok(content.into())
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts
export function readFileAsync(path: string): Promise<Buffer>
```
