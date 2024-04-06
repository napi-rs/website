---
description: 给函数和方法注入 Node-API Env。
---

# 注入 Env

`#[napi]` 宏是对 `Node-API` 的一个非常高级的抽象，大多数情况下，你使用 Rust 的原生 API 和包。

但是有时候你仍然需要访问底层的 `Node-API`，
例如调用 [`napi_async_cleanup_hook`](https://nodejs.org/api/n-api.html#napi_async_cleanup_hook)
或 [`napi_adjust_external_memory`](https://nodejs.org/api/n-api.html#napi_adjust_external_memory)。

对于这种情况，**NAPI-RS** 允许你通过 `#[napi]` 装饰，将 `Env` 注入到你的 `fn` 中。

```rust {4} filename="lib.rs"
use napi::{Env, bindgen_prelude::*};

#[napi]
fn call_env(env: Env, length: u32) -> Result<External<Vec<u32>>> {
  env.adjust_external_memory(length as i64)?;
  Ok(External::new(vec![0; length as usize]))
}
```

`Env` 将会被 **NAPI-RS** 自动注入，这不会影响 JavaScript 端的参数类型：

```ts filename="index.d.ts"
export function callEnv(length: number) -> ExternalObject<number[]>
```

您还可以在 `impl` 块中注入 `Env`：

```rust {20} filename="lib.rs"
use napi::bindgen_prelude::*;

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
  pub fn query(&self, env: Env, query: String) -> napi::Result<String> {
    self.engine.query(query).map_err(|err| Error::new(Status::GenericFailure, format!("Query failed {}", err)))
  }
}
```

这个行为和纯 `fn` 是一样的。
