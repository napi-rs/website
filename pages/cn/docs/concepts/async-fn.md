---
description: 使用 tokio 运行时运行一个 Rust 异步函数。
---

# 异步函数

::: info
为了使用 `async fn` ，你必须开启 `napi` 的 **_async_** 或 **_tokio_rt_** 特性：

**Cargo.toml**

```toml {3}
[dependencies]
napi = { version = "2", features = ["async"] }
```

:::

你可以通过 `AsyncTask` 和 `ThreadsafeFunction` 做很多 异步/多线程 的工作，但有时你可能想直接使用 Rust 异步生态系统中的包。

**NAPI-RS** 默认支持 `tokio` 运行时，如果你在 `async fn` 中 `await` 一个 tokio `future`，
**NAPI-RS** 将在 tokio 运行时中执行它，并将其转换为 JavaScript `Promise`。

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
