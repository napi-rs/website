---
title: 'async fn'
description: Run a Rust async fn with the tokio runtime.
---

# async fn

::: tip
Você deve habilitar o recurso **_async_** ou **_tokio_rt_** no `napi` para usar `async fn`:

**Cargo.toml**

```toml {3}
[dependencies]
napi = { version = "2", features = ["async"] }
```

:::

Você pode realizar muitos trabalhos async/multi-threaded com `AsyncTask` e `ThreadsafeFunction`, mas às vezes você pode querer usar diretamente as crates do ecossistema async do Rust.

**NAPI-RS** suporta o runtime do `tokio` por padrão. Se você `await` um `future` do tokio em uma `async fn`, **NAPI-RS** o executará no runtime do tokio e o converterá em uma `Promise` do JavaScript.

**lib.rs**

```rust {6}
use futures::prelude::*;
use napi::bindgen_prelude::*;
use tokio::fs;

#[napi]
async fn read_file_async(path: String) -> Result<Buffer> {
  fs::read(path)
    .map(|r| match r {
      Ok(content) => Ok(content.into()),
      Err(e) => Err(Error::new(
        Status::GenericFailure,
        format!("failed to read file, {}", e),
      )),
    })
    .await
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts
export function readFileAsync(path: string): Promise<Buffer>
```
