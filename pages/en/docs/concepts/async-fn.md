---
title: 'async fn'
description: Run a Rust async fn with the tokio runtime.
---

# async fn

::: tip
You must enable the **_async_** or **_tokio_rt_** feature in `napi` to use `async fn`:

**Cargo.toml**

```toml {2}
[dependencies]
napi = { version = "3", features = ["async"] }
```

:::

## Tokio integration

You can do a lot of async/multi-threaded work with `AsyncTask` and `ThreadsafeFunction`, but sometimes you may want to use the crates from the Rust async ecosystem directly.

**NAPI-RS** supports the `tokio` runtime by default. If you `await` a tokio `future` in `async fn`, **NAPI-RS** will execute it in the tokio runtime and convert it into a JavaScript `Promise`.

**lib.rs**

```rust {6}
use napi::bindgen_prelude::*;
use napi_derive::napi;
use tokio::fs;

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

## Unsafe `&mut self`

In some cases, you may need to use `&mut self` in an `async fn`. However, this is `unsafe` in **NAPI-RS**, because the `self` is also _owned_ by the Node.js runtime. You cannot ensure that the `self` is only owned by Rust.

**lib.rs**

```rust {9}
use napi_derive::napi;

#[napi]
pub struct Engine {}

#[napi]
impl Engine {
  #[napi]
  pub async fn run(&mut self) {}
}
```

```rust
error: &mut self in async napi methods should be marked as unsafe
 --> src/lib.rs:9:18
  |
9 |     pub async fn run(&mut self) {}
  |                  ^^^
```

You need to mark the `fn` as `unsafe` to use `&mut self` in an `async fn`.

**lib.rs**

```rust {9}
use napi_derive::napi;

#[napi]
pub struct Engine {}

#[napi]
impl Engine {
  #[napi]
  pub async unsafe fn run(&mut self) {}
}
```

## Auto reference

Usually, JavaScript values are only valid within a function call. `async fn` is not the case, the JavaScript values may be garbage collected in any `await` point.

::: info
See [Understanding Lifetime](/docs/concepts/understanding-lifetime) for more
details.

:::

There are 3 kinds of parameters are automatically turned into `Reference` types:

- `&self`
- `&mut self`
- `This<T>`

Considering the following example:

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub struct NativeClass {
  name: String,
}

#[napi]
impl NativeClass {
  #[napi(constructor)]
  pub fn new(name: String) -> Self {
    Self { name }
  }

  #[napi]
  pub async fn sleep(&self, delay: u32) -> Result<&str> {
    tokio::time::sleep(std::time::Duration::new(delay as u64, 0)).await;
    Ok(&self.name)
  }
}
```

**index.ts**

```ts
const nativeClass = new NativeClass('Brooklyn')

const name = await nativeClass.sleep(1)

console.log(name) // Brooklyn
```

There is a implicit [`napi_create_reference`](https://nodejs.org/api/n-api.html#napi_create_reference) call for the JavaScript `Object` value which holds the `NativeClass` before the `async fn` call; and a implicit [`napi_delete_reference`](https://nodejs.org/api/n-api.html#napi_delete_reference) call after the `async fn` call.

This strategy makes sure the `NativeClass` is alive during the `async fn` call.
