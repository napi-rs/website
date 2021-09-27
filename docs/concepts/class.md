---
title: 'Class'
---

:::info
There is no concept of a class in Rust. We decide to use the `struct` to represent a JavaScript `Class`.
:::

## `Constructor`

### Default `constructor`

If a all fields in a `Rust` struct is `pub`, then you can use `#[napi(constructor)]` to make the `struct` have a default `constructor`.

```rust title=lib.rs
#[napi(constructor)]
pub struct AnimalWithDefaultConstructor {
  pub name: String,
  pub kind: u32,
}
```

```ts title=index.d.ts
export class AnimalWithDefaultConstructor {
  name: string
  kind: number
  constructor(name: string, kind: number)
}
```

### Custom `constructor`

If you want to define a custom `constructor`, you can specified on of the `fn` in struct `impl` block as your custom constructor by using `#[napi(constructor)]`.

```rust title=lib.rs

// A complexity struct which can not be exposed into JavaScript directly.
struct QueryEngine {}

#[napi(js_name = "QueryEngine")]
struct JsQueryEngine {
  engine: QueryEngine,
}

#[napi]
impl JsQueryEngine {
  #[napi(constructor)]
  pub fn new() -> Self {
    JsQueryEngine { engine: QueryEngine::new() }
  }
}
```

```ts title=index.d.ts
export class QueryEngine {
  constructor()
}
```

:::caution
**NAPI-RS** now is not support `private constructor`. Your custom constructor must be `pub` in Rust.
:::

## Factory

Besides `constructor`, you can also define factory methods on `Class` by using `#[napi(factory)]`.

```rust title=lib.rs
// A complexity struct which can not be exposed into JavaScript directly.
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
}
```

```ts title=index.d.ts
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
}
```

:::caution
If no `#[napi(constructor)]` defined in `struct`, and `new` the `Class` in JavaScript. An error will be thrown.
:::

```js {3} title=test.mjs
import { QueryEngine } from './index.js'

new QueryEngine() // Error: Class contains no `constructor`, can not new it!
```

## `class method`

You can define a JavaScript class method with `#[napi]` on a struct `method` in **Rust**.

```rust title=lib.rs
// A complexity struct which can not be exposed into JavaScript directly.
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
  pub async fn query(&self, query: String) -> napi::Result<String> {
    self.engine.query(query).await
  }

  #[napi]
  pub fn status(&self) -> napi::Result<u32> {
    self.engine.status()
  }
}
```

```ts title=index.d.ts
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
  query(query: string) => Promise<string>
  status() => number
}
```

:::caution
`async fn` need `napi4` and `tokio_rt` features to be enabled.
:::

:::info
Any fn in `Rust` return `Result<T>` will be treated as `T` in JavaScript/TypeScript. If the `Result<T>` is `Err`, an JavaScript Error will be thrown.
:::

## `Getter`

Define [JavaScript class `getter`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get) using `#[napi(getter)]`. The Rust fn must be struct methods, not associated function.

```rust {22-25} title=lib.rs
// A complexity struct which can not be exposed into JavaScript directly.
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
  pub async fn query(&self, query: String) -> napi::Result<String> {
    self.engine.query(query).await
  }

  #[napi(getter)]
  pub fn status(&self) -> napi::Result<u32> {
    self.engine.status()
  }
}
```

```ts {4} title=index.d.ts
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
  get status(): number
}
```

## `Setter`

Define [JavaScript class `setter`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set) using `#[napi(setter)]`. The Rust fn must be struct methods, not associated function.

```rust {27-30} title=lib.rs
// A complexity struct which can not be exposed into JavaScript directly.
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
  pub async fn query(&self, query: String) -> napi::Result<String> {
    self.engine.query(query).await
  }

  #[napi(getter)]
  pub fn status(&self) -> napi::Result<u32> {
    self.engine.status()
  }

  #[napi(setter)]
  pub fn count(&mut self, count: u32) {
    self.engine.count = count;
  }
}
```

```ts {5} title=index.d.ts
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
  get status(): number
  set count(count: number)
}
```

## Class as argument

`Class` is different between [`Object`](./object). `Class` could have Rust methods, associated functions on it. Every field in `Class` could be mutated in JavaScript.

So the ownership of the `Class` is actually transferred to the JavaScript side while you are creating it. It is managed by JavaScript GC, and the only way you can pass it back is pass the `reference` of it.

```rust title=lib.rs
fn accept_class(engine: &QueryEngine) {
  // ...
}

fn accept_class_mut(engine: &mut QueryEngine) {
  // ...
}
```

```ts title=index.d.ts
export function acceptClass(engine: QueryEngine): void
export function acceptClassMut(engine: QueryEngine): void
```
