---
description: Inject Node-API Env into functions and methods.
---

# Inject Env

O macro `#[napi]` é uma abstração de alto nível para o `Node-API`. Na maioria das vezes, você utiliza a API nativa do Rust e suas crates.

Mas às vezes ainda é necessário acessar o `Node-API`, em um nível mais baixo, por exemplo, para chamar [`napi_async_cleanup_hook`](https://nodejs.org/api/n-api.html#napi_async_cleanup_hook) ou [`napi_adjust_external_memory`](https://nodejs.org/api/n-api.html#napi_adjust_external_memory).

Para esse cenário, o **NAPI-RS** permite que você injete o `Env` em sua `fn` que está decorada com o `#[napi]`.

```rust {4} filename="lib.rs"
use napi::{Env, bindgen_prelude::*};

#[napi]
fn call_env(env: Env, length: u32) -> Result<External<Vec<u32>>> {
  env.adjust_external_memory(length as i64)?;
  Ok(External::new(vec![0; length as usize]))
}
```

E o `Env` será injetado automaticamente pelo **NAPI-RS**, isso não afeta os tipos dos `arguments` do lado do JavaScript:

```ts filename="index.d.ts"
export function callEnv(length: number) -> ExternalObject<number[]>
```

Você também pode injetar `Env` no bloco `impl`:

```rust {20} filename="lib.rs"
use napi::bindgen_prelude::*;

// Uma estrutura complexa que não pode ser exposta diretamente ao JavaScript.
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

  /// Método da classe
  #[napi]
  pub fn query(&self, env: Env, query: String) -> napi::Result<String> {
    self.engine.query(query).map_err(|err| Error::new(Status::GenericFailure, format!("Query failed {}", err)))
  }
}
```

O comportamento é o mesmo que o de uma `fn` pura.
