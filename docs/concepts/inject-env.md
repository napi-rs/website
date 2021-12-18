---
title: 'Inject Env'
description: 'Inject Node-API Env into functions and methods'
---

The `#[napi]` macro is a very high level abstraction for the `Node-API`. Most of the time, you use the Rust native API and crates.

But sometimes you still need to access the low-level `Node-API`, for example, to call [`napi_async_cleanup_hook`](https://nodejs.org/api/n-api.html#napi_async_cleanup_hook) or [`napi_adjust_external_memory`](https://nodejs.org/api/n-api.html#napi_adjust_external_memory).

For this scenario, **NAPI-RS** allow you to inject `Env` into your `fn` which is decorated by the `#[napi]`.

```rust {4} title=lib.rs
use napi::{Env, bindgen_prelude::*};

#[napi]
fn call_env(env: Env, length: u32) -> Result<External<Vec<u32>>> {
  env.adjust_external_memory(length as i64)?;
  Ok(External::new(vec![0; length as usize]))
}
```

And the `Env` will be auto injected by **NAPI-RS**, it does not affect the `arguments` types in the JavaScript side:

```ts title=index.d.ts
export function callEnv(length: number) -> ExternalObject<number[]>
```

You can also inject `Env` in `impl` block:

```rust {18} title=lib.rs
// A complex struct which can not be exposed into JavaScript directly.
struct QueryEngine {}

#[napi(js_name = "QueryEngine")]
struct JsQueryEngine {
  engine: QueryEngine,
}

#[napi]
impl JsQueryEngine {
  #[napi(factory)]
  pub fn with_initial_count(count: u32) -> Self {
    JsQueryEngine { engine: QueryEngine::with_initial_count(count) }
  }

  /// Class method
  #[napi]
  pub async fn query(&self, env: Env, query: String) -> napi::Result<String> {
    self.engine.query(query).await
  }
}
```

The behavior is just the same with the pure `fn`.
