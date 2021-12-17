---
title: 'AsyncTask'
description: Running task in libuv thread pool and abort it with AbortSignal.
---

We need to talk about `Task` before talking about `AsyncTask`.

## `Task`

Addon modules often need to leverage async helpers from libuv as part of their implementation. This allows them to schedule work to be executed asynchronously so that their methods can return in advance of the work being completed. This allows them to avoid blocking overall execution of the Node.js application.

The `Task` trait provide a way to define such asynchronous task need to run in the libuv thread. You can implement the `compute` method, which will be called in the libuv thread.

```rust {11-13} title=lib.rs
use napi::{Task, Env, Result, JsNumber};

struct AsyncFib {
  input: u32,
}

impl Task for AsyncFib {
  type Output = u32;
  type JsValue = JsNumber;

  fn compute(&mut self) -> Result<Self::Output> {
    Ok(fib(self.input))
  }

  fn resolve(&mut self, env: Env, output: u32) -> Result<Self::JsValue> {
    enc.create_uint32(output)
  }
}
```

The `fn compute` below happened on the libuv thread, you can run some heavy computation here, which will not block the main JavaScript thread.

You may notice there are two associate types on the `Task` trait. The `type Output` and the `type JsValue`. The `Output` is the return type of the `compute` method. The `JsValue` is the return type of the `resolve` method.

:::info
We need separated `type Output` and `type JsValue` is because we can not call the JavaScript function back in the `fn compute`, it is not executed on the main thread. So we need the `fn resolve` which is running on the main thread to create the `JsValue` from `Output` and `Env` and call it back to the JavaScript.
:::

You can use the low-level API: `Env::spawn` to spawn a defined `Task` into libuv thread pool. See example in [Reference](../compat-mode/concepts/ref).

Expect `compute` and `resolve`, you can also provide `reject` method to do some clean up when `Task` ran into error, like `unref` some object:

```rust {28} title=lib.rs
struct CountBufferLength {
  data: Ref<JsBufferValue>,
}

impl CountBufferLength {
  pub fn new(data: Ref<JsBufferValue>) -> Self {
    Self { data }
  }
}

impl Task for CountBufferLength {
  type Output = usize;
  type JsValue = JsNumber;

  fn compute(&mut self) -> Result<Self::Output> {
    if self.data.len() == 10 {
      return Err(Error::from_reason("len can't be 5".to_string()));
    }
    Ok((&self.data).len())
  }

  fn resolve(self, env: Env, output: Self::Output) -> Result<Self::JsValue> {
    self.data.unref(env)?;
    env.create_uint32(output as _)
  }

  fn reject(self, env: Env, err: Error) -> Result<Self::JsValue> {
    self.data.unref(env)?;
    Err(err)
  }
}
```

You can also provide a `finally` method to do something after `Task` is `resolved` or `rejected`:

```rust {27} title=lib.rs
struct CountBufferLength {
  data: Ref<JsBufferValue>,
}

impl CountBufferLength {
  pub fn new(data: Ref<JsBufferValue>) -> Self {
    Self { data }
  }
}

#[napi]
impl Task for CountBufferLength {
  type Output = usize;
  type JsValue = JsNumber;

  fn compute(&mut self) -> Result<Self::Output> {
    if self.data.len() == 10 {
      return Err(Error::from_reason("len can't be 5".to_string()));
    }
    Ok((&self.data).len())
  }

  fn resolve(&mut self, env: Env, output: Self::Output) -> Result<Self::JsValue> {
    env.create_uint32(output as _)
  }

  fn finally(&mut self, env: Env, err: Error) -> Result<()> {
    self.data.unref(env)?;
  }
}
```

:::info
The `#[napi]` macro below the `impl Task for AsyncFib` is just for `.d.ts` generation. If no `#[napi]` defined here, the generated TypeScript type of returned `AsyncTask` will be `Promise<unknown>`.
:::

## `AsyncTask`

The `Task` you defined can not return to the `JavaScript` directly, `JavaScript` engine has no idea how to run and resolve value from your `struct`. `AsyncTask` is a wrapper of `Task` which can return to the `JavaScript` engine. It could be created with `Task` and a optional [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal).

```rust title=lib.rs
#[napi]
fn async_fib(input: u32) -> AsyncTask<AsyncFib> {
  AsyncTask::new(AsyncFib { input })
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export function asyncFib(input: number) => Promise<number>
```

### Create `AsyncTask` With `AbortSignal`

In some scenario, you may want to abort the queued `AsyncTask`, like using `debounce` on some compute tasks. You can also provide the `AbortSignal` to `AsyncTask`, so that you can abort the `AsyncTask` if it has not been started.

```rust {4} title=lib.rs
use napi::bindgen_prelude::AbortSignal;

#[napi]
fn async_fib(input: u32, signal: AbortSignal) -> AsyncTask<AsyncFib> {
  AsyncTask::with_signal(AsyncFib { input }, signal)
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export function asyncFib(input: number, signal: AbortSignal) => Promise<number>
```

If you invoke `AbortController.abort` in the JavaScript and the `AsyncTask` is not started yet, the `AsyncTask` will be aborted immediately, and reject an `AbortError`.

```js {6} title=test.mjs
import { asyncFib } from './index.js'

const controller = new AbortController()

asyncFib(20, controller.signal).catch((e) => {
  console.error(e) // Error: AbortError
})

controller.abort()
```

You can also provide the `Option<AbortSignal>` to `AsyncTask` if you don't know if the `AsyncTask` need to be aborted:

```rust title=lib.rs
use napi::bindgen_prelude::AbortSignal;

#[napi]
fn async_fib(input: u32, signal: Option<AbortSignal>) -> AsyncTask<AsyncFib> {
  AsyncTask::with_optional_signal(AsyncFib { input }, signal)
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export function asyncFib(input: number, signal?: AbortSignal | null) => Promise<number>
```

:::info
If `AsyncTask` is already started or completed, the `AbortController.abort` will have no effect.
:::
