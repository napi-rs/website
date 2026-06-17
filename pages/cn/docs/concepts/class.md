---
title: '类'
---

# 类

::: info
Rust 中没有类的概念。我们使用 `struct` 来表示 JavaScript 的 `Class`。
:::

## `Constructor`

### 默认 `constructor`

如果一个 `Rust` 结构体中的所有字段都是 `pub`，那么你可以使用 `#[napi(constructor)]` 来使 `struct` 有一个默认的 `constructor`。

**lib.rs**

```rust
#[napi(constructor)]
pub struct AnimalWithDefaultConstructor {
  pub name: String,
  pub kind: u32,
}
```

**index.d.ts**

```ts
export class AnimalWithDefaultConstructor {
  name: string
  kind: number
  constructor(name: string, kind: number)
}
```

### 自定义 `constructor`

如果你想定义一个自定义的 `constructor`，你可以在结构体的 `impl` 块中的构造函数 `fn` 上面使用 `#[napi(constructor)]`。

**lib.rs**

```rust
// A complex struct which cannot be exposed to JavaScript directly.
pub struct QueryEngine {}

#[napi(js_name = "QueryEngine")]
pub struct JsQueryEngine {
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

**index.d.ts**

```ts
export class QueryEngine {
  constructor()
}
```

::: warning
**NAPI-RS** 目前不支持 `private constructor`，在 Rust
中你的自定义构造函数必须是 `pub` 的。
:::

## 工厂

除了 `constructor` 之外，你还可以使用 `#[napi(factory)]` 在 `Class` 上定义工厂方法。

**lib.rs**

```rust
// 一个复杂的结构体，无法直接暴露给 JavaScript。
pub struct QueryEngine {}

#[napi(js_name = "QueryEngine")]
pub struct JsQueryEngine {
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

**index.d.ts**

```ts
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
}
```

::: warning
如果结构体中没有定义 `#[napi(constructor)]`，并且你尝试在 JavaScript
中创建一个 `Class` 的实例（`new`），这将会抛出一个错误。
:::

**test.mjs**

```js {3}
import { QueryEngine } from './index.js'

new QueryEngine() // Error: Class contains no `constructor`, cannot create it!
```

## `class method`

你可以在 **Rust** 的结构体方法上使用 `#[napi]` 定义一个 `JavaScript` 类方法。

**lib.rs**

```rust
// A complex struct which cannot be exposed to JavaScript directly.
pub struct QueryEngine {}

#[napi(js_name = "QueryEngine")]
pub struct JsQueryEngine {
  engine: QueryEngine,
}

#[napi]
impl JsQueryEngine {
  #[napi(factory)]
  pub fn with_initial_count(count: u32) -> Self {
    JsQueryEngine { engine: QueryEngine::with_initial_count(count) }
  }

  /// 类方法
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

**index.d.ts**

```ts
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
  query(query: string) => Promise<string>
  status() => number
}
```

::: warning
`async fn` 需要启用 `napi4` 和 `tokio_rt` 特性。
:::

::: info
任何返回 `Result<T>` 的 `Rust` `fn` 在 JavaScript/TypeScript 中都会被视为 `T` ，
如果 `Result<T>` 是 `Err`，则会抛出一个 JavaScript 错误。
:::

## `Getter`

使用 `#[napi(getter)]` 定义 [JavaScript 类的 `getter`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get)，
Rust 的 `fn` 必须是一个结构体方法，而不是一个关联函数。

**lib.rs**

```rust {22-25}
// 一个复杂的结构体，无法直接暴露给 JavaScript。
pub struct QueryEngine {}

#[napi(js_name = "QueryEngine")]
pub struct JsQueryEngine {
  engine: QueryEngine,
}

#[napi]
impl JsQueryEngine {
  #[napi(factory)]
  pub fn with_initial_count(count: u32) -> Self {
    JsQueryEngine { engine: QueryEngine::with_initial_count(count) }
  }

  /// 类方法
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

**index.d.ts**

```ts {4}
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
  get status(): number
}
```

## `Setter`

使用 `#[napi(setter)]` 定义 [JavaScript 类的 `setter`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set)，
Rust 的 `fn` 必须是一个结构体方法，而不是一个关联函数。

**lib.rs**

```rust {27-30}
// 一个复杂的结构体，无法直接暴露给 JavaScript。
pub struct QueryEngine {}

#[napi(js_name = "QueryEngine")]
pub struct JsQueryEngine {
  engine: QueryEngine,
}

#[napi]
impl JsQueryEngine {
  #[napi(factory)]
  pub fn with_initial_count(count: u32) -> Self {
    JsQueryEngine { engine: QueryEngine::with_initial_count(count) }
  }

  /// 类方法
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

**index.d.ts**

```ts {5}
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
  get status(): number
  set count(count: number)
}
```

## 类作为参数

`Class` 与 [`Object`](./object) 不同， `Class` 可以有 Rust 方法和关联函数。`Class` 中的每个字段都可以在 JavaScript 中被修改。

因此，当您创建类时，该类的所有权实际上已转移到 JavaScript 端，它由 JavaScript GC 管理，您只能通过传递其 `reference` 将其传回。

**lib.rs**

```rust {1,5}
pub fn accept_class(engine: &QueryEngine) {
  // ...
}

pub fn accept_class_mut(engine: &mut QueryEngine) {
  // ...
}
```

**index.d.ts**

```ts
export function acceptClass(engine: QueryEngine): void
export function acceptClassMut(engine: QueryEngine): void
```

## 属性描述

默认的属性描述是 `writable = true` 、`enumerable = true` 和 `configurable = true` ，你可以通过 `#[napi]` 宏控制属性描述：

**lib.rs**

```rust {20}
use napi::bindgen_prelude::*;
use napi_derive::napi;

// 一个复杂的结构体，无法直接暴露给 JavaScript。
#[napi]
pub struct QueryEngine {
  num: i32,
}

#[napi]
impl QueryEngine {
  #[napi(constructor)]
  pub fn new() -> Result<Self> {
    Ok(Self {
      num: 42,
    })
  }

  // writable / enumerable / configurable
  #[napi(writable = false)]
  pub fn get_num(&self) -> i32 {
    self.num
  }
}
```

在这个例子中，`QueryEngine` 的 `getNum` 方法是不可写的：

**main.mjs**

```js {4}
import { QueryEngine } from './index.js'

const qe = new QueryEngine()
qe.getNum = function () {} // TypeError: Cannot assign to read only property 'getNum' of object '#<QueryEngine>'
```

## 自定义终结逻辑

当 JavaScript 对象被垃圾回收时，NAPI-RS 会释放 JavaScript 对象中封装的 Rust 结构体，您还可以为 Rust 结构体指定自定义终结逻辑。

**lib.rs**

```rust {4, 26}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(custom_finalize)]
pub struct CustomFinalize {
  width: u32,
  height: u32,
  inner: Vec<u8>,
}

#[napi]
impl CustomFinalize {
  #[napi(constructor)]
  pub fn new(mut env: Env, width: u32, height: u32) -> Result<Self> {
    let inner = vec![0; (width * height * 4) as usize];
    let inner_size = inner.len();
    env.adjust_external_memory(inner_size as i64)?;
    Ok(Self {
      width,
      height,
      inner,
    })
  }
}

impl ObjectFinalize for CustomFinalize {
  fn finalize(self, mut env: Env) -> Result<()> {
    env.adjust_external_memory(-(self.inner.len() as i64))?;
    Ok(())
  }
}
```

首先，您可以在 `#[napi]` 宏中设置 `custom_finalize` 属性，NAPI-RS 将不会为 Rust 结构体生成默认的 `ObjectFinalize`。

然后，您可以自己为 Rust 结构体实现 `ObjectFinalize`。

在这个例子中，`CustomFinalize` 结构体在 **构造函数** 中增加外部内存，并在 `fn finalize` 中减少外部内存。

## `instance of`

所有 `#[napi]` 类都有 `fn instance_of`：

**lib.rs**

```rust {9}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub struct NativeClass {}

#[napi]
pub fn is_native_class_instance(env: Env, value: Unknown) -> Result<bool> {
  NativeClass::instance_of(env, value)
}
```

**main.mjs**

```js
import { NativeClass, isNativeClassInstance } from './index.js'

const nc = new NativeClass()
console.log(isNativeClassInstance(nc)) // true
console.log(isNativeClassInstance(1)) // false
```
