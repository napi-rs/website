---
title: 'Await Promise'
description: Await JavaScript Promise in the Rust.
---

Await JavaScript `Promise` in the Rust sounds crazy, but it's feasible in **NAPI-RS**.

:::caution
await JavaScript `Promise` need the `tokio_rt` and `napi4` features to be enabled.
:::

```rust title=lib.rs
use napi::bindgen_prelude::*;

#[napi]
pub async fn async_plus_100(p: Promise<u32>) -> Result<u32> {
  let v = p.await?;
  Ok(v + 100)
}
```

```js {4} title=test.mjs
import { asyncPlus100 } from './index.js'

const fx = 20
const result = await asyncPlus100(
  new Promise((resolve) => {
    setTimeout(() => resolve(fx), 50)
  }),
)

console.log(result) // 120
```
