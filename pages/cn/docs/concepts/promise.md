---
title: 'Await Promise'
description: 在 Rust 中 await 一个 JavaScript Promise。
---

# Await Promise

在 Rust 中 await 一个 JavaScript `Promise` 听起来很疯狂，但在 **NAPI-RS** 中是可行的。

::: tip
Await JavaScript `Promise` 需要启用 `async` 或 `tokio_rt` 特性；
`tokio_rt` 会自动启用 `napi4`。

:::

::: info
当 `T: Send` 时 `Promise<T>` 才是 `Send`，因此编译器会阻止非 `Send` 的
resolve 值跨 Tokio worker thread 移动。

:::

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub async fn async_plus_100(p: Promise<u32>) -> Result<u32> {
  let v = p.await?;
  v.checked_add(100)
    .ok_or_else(|| Error::new(Status::InvalidArg, "result exceeds u32"))
}
```

**test.mjs**

```js {4}
import { asyncPlus100 } from './index.js'

const fx = 20
const result = await asyncPlus100(
  new Promise((resolve) => {
    setTimeout(() => resolve(fx), 50)
  }),
)

console.log(result) // 120
```
