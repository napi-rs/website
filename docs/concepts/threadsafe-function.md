---
title: 'ThreadsafeFunction'
description: Call a JavaScript callback in other threads.
---

[`ThreadSafe Function`](https://nodejs.org/api/n-api.html#asynchronous-thread-safe-function-calls) is a complex concept in Node.js. As we all know, Node.js is single threaded, so you can't access [`napi_env`](https://nodejs.org/api/n-api.html#napi_env), [`napi_value`](https://nodejs.org/api/n-api.html#napi_value), and [`napi_ref`](https://nodejs.org/api/n-api.html#napi_ref) on another thread.

:::info
[`napi_env`](https://nodejs.org/api/n-api.html#napi_env), [`napi_value`](https://nodejs.org/api/n-api.html#napi_value), and [`napi_ref`](https://nodejs.org/api/n-api.html#napi_ref) are low level concepts in `Node-API`, which the `#[napi]` macro of **NAPI-RS** is built on top of. **NAPI-RS** also provides a [low level API](../compat-mode/concepts/env) to access the original `Node-API`.
:::

`Node-API` provides the complex `ThreadSafe Function` APIs to call JavaScript functions on other threads. It's very complex so many developers don't understand how to use it correctly. **NAPI-RS** provides a limited version of `ThreadSafe Function` APIs to make it easier to use:

```rust {10} title=lib.rs
use std::thread;

use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode},
};

#[napi]
pub fn call_threadsafe_function(callback: JsFunction) -> Result<()> {
  let tsfn: ThreadsafeFunction<u32, ErrorStrategy::CalleeHandled> = callback
    .create_threadsafe_function(0, |ctx| {
      ctx.env.create_uint32(ctx.value + 1).map(|v| vec![v])
    })?;
  for n in 0..100 {
    let tsfn = tsfn.clone();
    thread::spawn(move || {
      tsfn.call(Ok(n), ThreadsafeFunctionCallMode::Blocking);
    });
  }
  Ok(())
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export function callThreadsafeFunction(callback: (...args: any[]) => any): void
```

`ThreadsafeFunction` is very complex so **NAPI-RS** does not provide the precise TypeScript definition generation of it. If you want to have a better TypeScript type, you can use `#[napi(ts_args_type)]` to override the type of `JsFunction` argument:

```rust {8} title=lib.rs
use std::thread;

use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode},
};

#[napi(ts_args_type = "callback: (err: null | Error, result: number) => void")]
pub fn call_threadsafe_function(callback: JsFunction) -> Result<()> {
  let tsfn: ThreadsafeFunction<u32, ErrorStrategy::CalleeHandled> = callback
    .create_threadsafe_function(0, |ctx| {
      ctx.env.create_uint32(ctx.value + 1).map(|v| vec![v])
    })?;
  for n in 0..100 {
    let tsfn = tsfn.clone();
    thread::spawn(move || {
      tsfn.call(Ok(n), ThreadsafeFunctionCallMode::Blocking);
    });
  }
  Ok(())
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export function callThreadsafeFunction(
  callback: (err: null | Error, result: number) => void,
): void
```

## ErrorStrategy

There are two different error handling strategies for `Threadsafe Function`. The strategy can be defined in the second generic parameter of `ThreadsafeFunction`:

```rust title=lib.rs
let tsfn: ThreadsafeFunction<u32, ErrorStrategy::CalleeHandled> = ...
```

The first argument in the generic parameter of course is the return type of the `Threadsafe Function`.

### `ErrorStrategy::CalleeHandled`

`Err` from Rust code will be passed into the first argument of the JavaScript callback. This behaviour follows the async callback conventions from Node.js: https://nodejs.org/en/knowledge/errors/what-are-the-error-conventions/. Many async APIs in Node.js are designed in this shape, like `fs.read`.

With `ErrorStrategy::CalleeHandled`, you must call the `ThreadsafeFunction` with the `Result` type, so that the `Error` will be handled and passed back to the JavaScript callback:

```rust {17} title=lib.rs
use std::thread;

use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode},
};

#[napi(ts_args_type = "callback: (err: null | Error, result: number) => void")]
pub fn call_threadsafe_function(callback: JsFunction) -> Result<()> {
  let tsfn: ThreadsafeFunction<u32, ErrorStrategy::CalleeHandled> = callback
    .create_threadsafe_function(0, |ctx| {
      ctx.env.create_uint32(ctx.value + 1).map(|v| vec![v])
    })?;
  for n in 0..100 {
    let tsfn = tsfn.clone();
    thread::spawn(move || {
      tsfn.call(Ok(n), ThreadsafeFunctionCallMode::Blocking);
    });
  }
  Ok(())
}
```

### `ErrorStrategy::Fatal`

No `Error` will be passed back to the JavaScript side. You can use this strategy to avoid the `Ok` wrapping in the Rust side if your code will never return `Err`.

With this strategy, `ThreadsafeFunction` doesn't need to be called with `Result<T>`, and the first argument of JavaScript callback is the value from the Rust, not `Error | null`.

```rust {17} title=lib.rs
use std::thread;

use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode},
};

#[napi(ts_args_type = "callback: (result: number) => void")]
pub fn call_threadsafe_function(callback: JsFunction) -> Result<()> {
  let tsfn: ThreadsafeFunction<u32, ErrorStrategy::Fatal> = callback
    .create_threadsafe_function(0, |ctx| {
      ctx.env.create_uint32(ctx.value + 1).map(|v| vec![v])
    })?;
  for n in 0..100 {
    let tsfn = tsfn.clone();
    thread::spawn(move || {
      tsfn.call(n, ThreadsafeFunctionCallMode::Blocking);
    });
  }
  Ok(())
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts {2} title=index.d.ts
export function callThreadsafeFunction(callback: (result: number) => void): void
```
