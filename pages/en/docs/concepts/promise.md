---
title: 'Promise'
description: JavaScript Promise in Rust.
---

## `Promise<T>`

Awaiting a JavaScript `Promise` in Rust sounds crazy, but it's feasible in **NAPI-RS**.
The `Promise<T>` in **NAPI-RS** implements the `std::future::Future` trait, so you can use the `await` keyword to await it.

::: tip
Awaiting a JavaScript `Promise` needs the `async` or `tokio_rt` feature.
`tokio_rt` enables `napi4` for you.

:::

::: info
`Promise<T>` is `Send` when `T` is `Send`, so the compiler prevents a
non-`Send` resolved value from crossing Tokio worker threads.

:::

**lib.rs**

```rust {5}
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

## `PromiseRaw<'env, T>`

`PromiseRaw<'env, T>` represent the raw `Promise` value in the `JavaScript`, it contains the lifetime so it can only be used in the sync context.

But conveniently, it can call methods on the JavaScript Promise, such as `then`, `catch`, and `finally`.

**lib.rs**

```rust {6}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn promise_callback(promise: PromiseRaw<u32>) -> Result<PromiseRaw<u32>> {
  promise.then(|ctx| Ok(ctx.value + 100))
}
```

**index.ts**

```js
import { promiseCallback } from './index.js'

const value = await promiseCallback(Promise.resolve(100))

console.log(value) // 200
```
