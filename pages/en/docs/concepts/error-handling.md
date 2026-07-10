---
title: 'Error handling'
description: Throw, reject, preserve, and classify errors across synchronous and asynchronous napi-rs APIs.
---

# Error handling

Expected failures should cross the native boundary as `napi::Result<T>`, an alias for `std::result::Result<T, napi::Error>`. napi-rs turns the `Err` into a synchronous exception or a Promise rejection according to the exported API.

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn divide(left: f64, right: f64) -> Result<f64> {
  if right == 0.0 {
    return Err(Error::new(Status::InvalidArg, "right must not be zero"));
  }
  Ok(left / right)
}
```

**index.mjs**

```js
try {
  divide(1, 0)
} catch (error) {
  console.error(error.code) // "InvalidArg"
  console.error(error.message) // "right must not be zero"
}
```

TypeScript does not encode thrown exceptions or rejected Promises. Document domain errors in JSDoc and test their JavaScript shape.

## The core types

```rust
pub type Result<T, S = Status> = std::result::Result<T, Error<S>>;

pub struct Error<S = Status> {
  pub status: S,
  pub reason: String,
  pub cause: Option<Box<Error>>,
  // private reference to an original JavaScript exception when available
}
```

| Field             | JavaScript meaning | Notes                                                                       |
| ----------------- | ------------------ | --------------------------------------------------------------------------- |
| `reason`          | `error.message`    | Human-readable description.                                                 |
| `status.as_ref()` | `error.code`       | `Status` is primarily a Node-API status, not an application error taxonomy. |
| `cause`           | `error.cause`      | Set with `set_cause`; nested causes are converted recursively.              |

Use `Error::from_reason(message)` for a `GenericFailure`, or `Error::new(status, message)` when a Node-API status conveys useful information.

**lib.rs**

```rust
#[napi]
pub fn load_config() -> Result<()> {
  std::fs::read_to_string("config.json")
    .map(|_| ())
    .map_err(|source| {
      let mut error = Error::new(Status::GenericFailure, "could not load config");
      error.set_cause(Error::from(source));
      error
    })
}
```

`Error` implements conversions for common failures including `std::io::Error` and `std::ffi::NulError`. With `serde-json`, it also converts `serde_json::Error` to `Status::InvalidArg`.

## Synchronous functions

When a synchronous exported function returns `Err`, the generated callback throws a JavaScript `Error` before returning to JavaScript.

| Rust return                   | JavaScript behavior                               |
| ----------------------------- | ------------------------------------------------- |
| `T`                           | Returns a value. Conversion failures still throw. |
| `Result<T>` with `Ok(value)`  | Converts and returns `value`.                     |
| `Result<T>` with `Err(error)` | Throws an `Error`.                                |

Argument conversion happens before the Rust function is called. A wrong input type therefore throws a conversion error even if the function's Rust return type is not `Result`.

## Async functions

After its arguments have converted successfully, an exported Rust `async fn`
returns a JavaScript Promise:

| Future outcome                  | JavaScript behavior                           |
| ------------------------------- | --------------------------------------------- |
| `T`                             | Fulfills the Promise after converting `T`.    |
| `Result<T>::Ok(value)`          | Fulfills the Promise with `value`.            |
| `Result<T>::Err(error)`         | Rejects the Promise with the converted error. |
| Return-value conversion failure | Rejects the Promise.                          |

Argument validation and conversion still run synchronously before that Promise
is created. Invalid input can therefore throw synchronously. With
`#[napi(return_if_invalid)]`, invalid input returns `undefined` synchronously
instead, even though the generated declaration still describes the successful
path as returning `Promise<T>`.

**lib.rs**

```rust
#[napi]
pub async fn read_text(path: String) -> Result<String> {
  napi::tokio::fs::read_to_string(&path)
    .await
    .map_err(|source| {
      let mut error = Error::new(Status::GenericFailure, format!("could not read {path}"));
      error.set_cause(source.into());
      error
    })
}
```

This example requires `napi`'s `async` (or `tokio_rt`) and `tokio_fs`
features. See [async fn](/docs/concepts/async-fn) for runtime and lifetime rules.

### Async stack traces

Errors constructed after work moves to another thread normally have a stack beginning at the rejection point, not the original JavaScript call. The optional `deferred_trace` feature captures a JavaScript error when the deferred Promise is created and reuses that stack when rejecting a napi-rs deferred.

**Cargo.toml**

```toml
[dependencies]
napi = { version = "3", features = ["async", "deferred_trace"] }
```

This adds an error object/reference to each affected deferred operation. Enable it when the diagnostic value is worth that allocation and reference-management cost.

## `AsyncTask`

`AsyncTask<T>` runs `Task::compute` in libuv's worker pool and completes the Promise on the JavaScript thread.

1. `compute` returns `Result<Output>` off the JavaScript thread.
2. `Ok(output)` is passed to `resolve` on the JavaScript thread.
3. `Err(error)` is passed to `reject` on the JavaScript thread.
4. The resulting `JsValue` resolves the Promise; an error from `resolve` or `reject` rejects it.
5. `finally` runs after either path for cleanup.

The default `Task::reject` simply returns the same `Err`, so the Promise rejects. A custom `reject` may instead return `Ok(fallback)`, which **recovers** and fulfills the Promise.

**lib.rs**

```rust
impl Task for Lookup {
  type Output = String;
  type JsValue = String;

  fn compute(&mut self) -> Result<Self::Output> {
    self.lookup().map_err(Error::from)
  }

  fn resolve(&mut self, _: Env, output: Self::Output) -> Result<Self::JsValue> {
    Ok(output)
  }

  fn reject(&mut self, _: Env, error: Error) -> Result<Self::JsValue> {
    if error.status == Status::GenericFailure {
      Ok("default".to_owned()) // Promise fulfillment, not rejection
    } else {
      Err(error)
    }
  }
}
```

Cancellation before libuv starts the task rejects with an error whose name is `AbortError`. Once the task has started, cancellation is not guaranteed to stop the computation. See [AsyncTask](/docs/concepts/async-task).

## ThreadsafeFunction errors

ThreadsafeFunction has two error strategies:

- With `CalleeHandled = true` (the default), the JavaScript callback is error-first: `(error, value) => ...`. Call it with `Ok(value)` or `Err(error)`.
- With `CalleeHandled = false`, the generated callback has no error parameter and the Rust call accepts the value directly. Handle native failures before calling it.

`call_with_return_value` reports the callback result to its Rust completion
callback. With `CalleeHandled = true`, `call_async` also returns a JavaScript
throw as `Err`. With `CalleeHandled = false`, use `call_async_catch`; plain
`call_async` routes a synchronous throw through `napi_fatal_exception` instead.
Fire-and-forget calls cannot turn a later JavaScript throw into the return value
of the originating Rust call.

ThreadsafeFunction queue and lifecycle failures use Node-API statuses such as `QueueFull` or `Closing`; always inspect the return value of non-blocking or async call methods when the API provides one. See [ThreadsafeFunction](/docs/concepts/threadsafe-function) for its complete generic parameters and call modes.

## Custom error codes

`Error<S>` accepts any status type implementing `AsRef<str>`. This sets `error.code` without changing the JavaScript error subclass.

**lib.rs**

```rust
#[derive(Debug)]
pub enum ConfigError {
  Missing,
  Invalid,
}

impl AsRef<str> for ConfigError {
  fn as_ref(&self) -> &str {
    match self {
      Self::Missing => "ERR_CONFIG_MISSING",
      Self::Invalid => "ERR_CONFIG_INVALID",
    }
  }
}

#[napi]
pub fn validate_config(present: bool) -> Result<(), ConfigError> {
  if present {
    Ok(())
  } else {
    Err(Error::new(ConfigError::Missing, "configuration is required"))
  }
}
```

The generated wrapper accepts the custom status because it only needs `AsRef<str>`. If lower-level napi-rs APIs must convert their `Status` into the custom type, also implement `From<Status>`.

## Error subclasses and arbitrary thrown values

Returning an ordinary `Error` from an exported function produces a JavaScript `Error`. To throw a more specific built-in subclass directly, use `Env`:

**lib.rs**

```rust
#[napi]
pub fn set_percentage(env: Env, value: f64) -> Result<()> {
  if !(0.0..=100.0).contains(&value) {
    return env.throw_range_error("percentage must be between 0 and 100", Some("ERR_RANGE"));
  }
  Ok(())
}
```

Available helpers include `throw_error`, `throw_type_error`, and `throw_range_error`. `throw_syntax_error` requires `napi9`. `Env::throw(value)` can throw any `ToNapiValue`, including a custom JavaScript error object.

The lower-level wrappers `JsError`, `JsTypeError`, `JsRangeError`, and, with `napi9`, `JsSyntaxError` can construct or throw those subclasses when working with raw environments.

::: warning
After calling an `Env::throw_*` method, return immediately. A JavaScript
exception is pending in that environment; continuing to call unrelated
Node-API operations can replace or obscure the original failure.

:::

## Preserving a JavaScript exception

Converting an `Unknown` JavaScript value into `Error` records its message and
cause. On native builds it also attempts to retain a reference to the original
value. When that retained value is a JavaScript `Error` and the Rust error is
converted back in its owning JavaScript environment, napi-rs can reuse the
object, preserving its subclass, stack, and custom properties. A retained
non-`Error` value is not passed through by `Result` error conversion; napi-rs
rebuilds a generic `Error` from the owned error data instead.

**lib.rs**

```rust
#[napi]
pub fn pass_error_through(value: Unknown) -> Result<()> {
  Err(value.into())
}
```

Important boundaries:

- `Error::try_clone` always preserves owned status, reason, and cause information.
- With Node-API 4 lifecycle support, a clone can share the retained reference safely across threads, but the original object is only dereferenced on its owning JavaScript thread.
- When an error is surfaced in another environment/thread, napi-rs rebuilds a fresh generic `Error` from status, reason, and cause rather than touching a foreign environment.
- WASI builds do not retain a native `napi_ref`; they rebuild from the available data.

Do not use `try_clone` as a guarantee of JavaScript object identity across workers or isolates.

## `anyhow`

Enable `error_anyhow` to add conversion from `anyhow::Error` and re-export the dependency through napi-rs:

**Cargo.toml**

```toml
[dependencies]
napi = { version = "3", features = ["error_anyhow"] }
```

**lib.rs**

```rust
#[napi]
pub fn parse_document(source: String) -> Result<Document> {
  parse(&source).map_err(Error::from)
}
```

The conversion uses `Status::GenericFailure` and formats the anyhow error chain into the reason. If callers need stable machine-readable codes or a structured `cause`, map the domain error into `Error` explicitly instead.

## Panics are not ordinary errors

A Rust panic is not a supported substitute for `Result` at the FFI boundary. An uncaught panic in a synchronous generated callback can terminate the process.

`#[napi(catch_unwind)]` wraps a function or method call in `std::panic::catch_unwind` and converts an unwinding payload into a `GenericFailure` error:

**lib.rs**

```rust
#[napi(catch_unwind)]
pub fn call_untrusted_rust() {
  library_that_may_panic();
}
```

Its limits are fundamental:

- It only works when the crate is built with an unwind-capable panic strategy. `panic = "abort"` cannot be caught.
- Some Rust operations abort without unwinding.
- It catches the Rust call at that generated boundary, not panics on arbitrary detached threads.
- Catching a panic does not prove that external state remains consistent.

Panics while polling napi-rs's Tokio tasks are observed by the runtime and normally reject the deferred Promise, but the available panic payload and stack are limited. Keep recoverable failures in `Result` and reserve panics for violated internal invariants.

## Design checklist

- Use stable custom codes for failures callers are expected to branch on.
- Preserve the original failure with `cause` rather than concatenating unrelated messages.
- Throw or reject; do not log-and-return a plausible value unless recovery is part of the API contract.
- In `AsyncTask::reject`, remember that `Ok` fulfills the Promise.
- Do not access `Env`, scoped JavaScript values, or raw `napi_value`s from worker threads.
- Treat error object identity as local to one JavaScript environment.
- Test the JavaScript `name`, `code`, `message`, `cause`, and sync-versus-async behavior—not only the Rust result.
