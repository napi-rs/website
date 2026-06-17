---
description: 在 Rust 中 await 一个 JavaScript Promise。
---

# Await Promise

在 Rust 中 await 一个 JavaScript `Promise` 听起来很疯狂，但在 **NAPI-RS** 中是可行的。

::: info
Await JavaScript `Promise` 需要启用 `tokio_rt` 和 `napi4` 特性。
:::

**lib.rs**

```rust
use napi::bindgen_prelude::*;

#[napi]
pub async fn async_plus_100(p: Promise<u32>) -> Result<u32> {
  let v = p.await?;
  Ok(v + 100)
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
