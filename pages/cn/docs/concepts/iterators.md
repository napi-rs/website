---
title: '迭代器与异步迭代器'
description: 使用 Generator 和 AsyncGenerator 实现 JavaScript 迭代协议。
---

# 迭代器与异步迭代器

napi-rs 可以让原生类实现 JavaScript 的同步或异步迭代协议。这些 API 目前在 Rust 源码中标为**实验性**：请测试你发布的确切 napi-rs 与运行时版本，并预期 trait 或生命周期行为仍会调整。

| Rust 标记和 trait                                      | JavaScript 协议                                                       | Cargo 特性               |
| ------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------ |
| `#[napi(iterator)]` + `Generator` 或 `ScopedGenerator` | `Symbol.iterator`、`next`、`return`、`throw`                          | 基础 `napi` API          |
| `#[napi(async_iterator)]` + `AsyncGenerator`           | `Symbol.asyncIterator`，以及返回 Promise 的 `next`、`return`、`throw` | `tokio_rt`（或 `async`） |

这两个标记属性不能同时用于同一个类。带标记的类也不能有名为 `next`、`return` 或 `throw` 的公开字段，因为 napi-rs 会安装这些协议方法。

## 同步迭代器

当 yield 的值是拥有所有权的 Rust 值时，实现 `Generator`：

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(iterator)]
pub struct Counter {
  current: u32,
  end: u32,
}

#[napi]
impl Generator for Counter {
  type Yield = u32;
  type Next = u32;
  type Return = ();

  fn next(&mut self, value: Option<Self::Next>) -> Option<Self::Yield> {
    if let Some(next) = value {
      self.current = next;
    }
    if self.current >= self.end {
      return None;
    }
    let value = self.current;
    self.current += 1;
    Some(value)
  }
}

#[napi]
impl Counter {
  #[napi(constructor)]
  pub fn new(end: u32) -> Self {
    Self { current: 0, end }
  }
}
```

**index.mjs**

```js
const counter = new Counter(3)

console.log(counter.next()) // { value: 0, done: false }
console.log(counter.next(2)) // { value: 2, done: false }
console.log(counter.next()) // { done: true }

console.log([...new Counter(3)]) // [0, 1, 2]
```

生成的声明会扩展 `Iterator<Yield, Return, Next>`。

### 关联类型

| 关联类型 | 所需 trait      | 用途                                                          |
| -------- | --------------- | ------------------------------------------------------------- |
| `Yield`  | `ToNapiValue`   | 将 `next` 或 `catch` 返回的 `Some(value)` 转换为 JavaScript。 |
| `Next`   | `FromNapiValue` | 转换传给 `iterator.next(value)` 的可选参数。                  |
| `Return` | `FromNapiValue` | 转换传给 `iterator.return(value)` 的可选参数。                |

该方法接收 `Option<Next>`，因为 JavaScript 可能不带参数调用 `next()`。`Some(yielded)` 会生成 `{ value: yielded, done: false }`；`None` 只会让本次调用生成 `{ done: true }`。同步适配器不会保留自然完成状态：之后调用 `next()` 会再次调用 Rust。如果后续调用必须一直保持完成状态，请在 Rust 结构体中记录该状态，并继续返回 `None`。

### `return()` 与 `complete`

当 JavaScript 提前关闭迭代时（例如 `for...of` 循环执行 `break`），可以覆盖 `complete` 进行清理。

**lib.rs**

```rust
fn complete(&mut self, _value: Option<Self::Return>) -> Option<Self::Yield> {
  self.release_native_cursor();
  None
}
```

当前同步适配器会调用 `complete`、把生成器标记为完成，并用 JavaScript 提供的参数作为返回的迭代器结果值。`complete` 返回的 `Option<Yield>` 目前不会暴露。请把它视为清理 hook；在这个实验性 API 稳定之前，不要依赖它的返回值。

### `throw()` 与 `catch`

默认 `catch` 会把原始 JavaScript 值作为 `Err` 返回，因此 `iterator.throw(error)` 会抛出该值并结束迭代。

覆盖它可以实现恢复：

**lib.rs**

```rust
fn catch<'env>(
  &'env mut self,
  _env: Env,
  value: Unknown<'env>,
) -> std::result::Result<Option<Self::Yield>, Unknown<'env>> {
  if self.can_recover() {
    Ok(Some(self.fallback()))
  } else {
    Err(value)
  }
}
```

- `Err(value)` 会抛出 `value` 并结束迭代。
- `Ok(Some(value))` 会以 `done: false` yield 该值。
- `Ok(None)` 会完成迭代而不抛出异常。

上面的签名使用 `std::result::Result`，因为错误一侧是原始 `Unknown`，不是 `napi::Error`。

## 作用域内的同步 yield

`Generator::Yield` 必须是拥有所有权或可以直接转换的值。当 yield 值借用当前 JavaScript 环境时，请实现 `ScopedGenerator<'env>`：

**lib.rs**

```rust
use napi::iterator::ScopedGenerator;

#[napi(iterator)]
pub struct ObjectCounter {
  current: u32,
  end: u32,
}

#[napi]
impl<'env> ScopedGenerator<'env> for ObjectCounter {
  type Yield = Object<'env>;
  type Next = ();
  type Return = ();

  fn next(
    &mut self,
    env: &'env Env,
    _value: Option<Self::Next>,
  ) -> Option<Self::Yield> {
    if self.current >= self.end {
      return None;
    }
    let mut object = Object::new(env).ok()?;
    object.set("value", self.current).ok()?;
    self.current += 1;
    Some(object)
  }
}
```

作用域 trait 会在 `next` 和 `catch` 中接收 `&Env`。yield 的值会立即在 JavaScript 线程中转换；不能把它存入类中或移到其他线程。

## 迭代器辅助方法与原型

`Symbol.iterator` 会返回类实例本身。在暴露全局 `Iterator` 构造函数的运行时上，napi-rs 会调整生成类的原型，使其继承 `Iterator.prototype`，从而提供 `map`、`filter`、`take` 和 `drop` 等迭代器辅助方法。在没有该全局对象的运行时上，基础迭代协议仍然可用，但这些辅助方法不存在。

由于原型集成也属于该实验性 API 的一部分，请测试子类化，以及任何会冻结或替换类原型的代码。

## 异步迭代器

启用异步运行时：

**Cargo.toml**

```toml
[dependencies]
napi = { version = "3", features = ["async", "tokio_time"] }
napi-derive = "3"
```

然后标记类并实现 `AsyncGenerator`：

**lib.rs**

```rust
use std::future::Future;

use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(async_iterator)]
pub struct DelayedCounter {
  current: u32,
  end: u32,
  delay_ms: u64,
}

#[napi]
impl AsyncGenerator for DelayedCounter {
  type Yield = u32;
  type Next = ();
  type Return = ();

  fn next(
    &mut self,
    _value: Option<Self::Next>,
  ) -> impl Future<Output = Result<Option<Self::Yield>>> + Send + 'static {
    let value = self.current;
    let end = self.end;
    let delay_ms = self.delay_ms;
    self.current += 1;

    async move {
      napi::tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
      Ok((value < end).then_some(value))
    }
  }
}

#[napi]
impl DelayedCounter {
  #[napi(constructor)]
  pub fn new(end: u32, delay_ms: u32) -> Self {
    Self { current: 0, end, delay_ms: delay_ms as u64 }
  }
}
```

**index.mjs**

```js
for await (const value of new DelayedCounter(3, 10)) {
  console.log(value) // 0, 1, 2
}
```

生成的类会实现：

```ts
[Symbol.asyncIterator](): AsyncGenerator<Yield, Return, Next | undefined>
```

### 异步边界

`AsyncGenerator` 有意禁止 JavaScript 作用域值跨越 await 点：

```rust
type Yield: ToNapiValue + Send + 'static;

fn next(
  &mut self,
  value: Option<Self::Next>,
) -> impl Future<Output = Result<Option<Self::Yield>>> + Send + 'static;
```

future 不能借用 `self`。请在创建 `async move` 块之前更新同步状态，并复制或克隆 future 所需的一切，就像上例所示。作用域内的 `Object<'env>`、`Function<'env, ...>` 或 `BufferSlice<'env>` 不能作为 yield 类型。请返回拥有所有权的值；或者稍后在另一个明确于 JavaScript 线程提供 `Env` 的 API 中创建 JavaScript 值。

### 异步 `next()`

每次调用都会返回 Promise：

- `Ok(Some(value))` 兑现为 `{ value, done: false }`。
- `Ok(None)` 兑现为 `{ value: undefined, done: true }`。
- `Err(error)` 拒绝 Promise。

当前实验性异步适配器在 `Ok(None)` 后不会保留独立的终止状态标志。如果后续调用必须一直保持完成状态，请在 Rust 结构体中记录该状态，并继续返回 `Ok(None)`。

不要假定重叠的 `next()` 调用会自动串行化。在返回 future 之前发生的状态修改会立即在 JavaScript 线程执行，而生成的多个 future 可以同时处于进行中。请为多个并发进行中的操作设计状态机，或明确要求调用者等待一个结果后再请求下一个结果。

### 异步 `return()`

覆盖 `complete` 可以执行异步清理：

**lib.rs**

```rust
fn complete(
  &mut self,
  _value: Option<Self::Return>,
) -> impl Future<Output = Result<Option<Self::Yield>>> + Send + 'static {
  let handle = self.take_handle();
  async move {
    handle.close().await.map_err(Error::from)?;
    Ok(None)
  }
}
```

返回的 Promise 总会以 `done: true` 兑现；`Some(value)` 会成为其最终值，`None` 会变为 `undefined`。错误会导致拒绝。与 `next` 一样，适配器本身不会为之后的操作保留终止标志，因此如果调用者可能保留并复用该迭代器对象，请在类中记录完成状态。

这里存在一个实验性类型不匹配：运行时的 `complete` 返回 `Option<Self::Yield>`，而生成的 `AsyncGenerator<Yield, Return, Next>` 声明会把最终值标为 `Return`。如果 `complete` 可能返回 `Some(value)`，请让 `Yield` 和 `Return` 使用相同类型；否则只返回 `None`。当 `Yield` 与 `Return` 类型不同时，生成的声明可能与运行时值不一致。

当 `for await...of` 循环提前退出时，JavaScript 通常会调用 `return()`，但即使迭代器没有正常 return 就被垃圾回收，清理也应可以正确处理。

### 异步 `throw()`

默认 `catch` 会把抛出的 JavaScript 值转换为 `napi::Error`，因此返回的 Promise 会被拒绝。

**lib.rs**

```rust
fn catch(
  &mut self,
  _env: Env,
  value: Unknown,
) -> impl Future<Output = Result<Option<Self::Yield>>> + Send + 'static {
  let error: Error = value.into();
  async move { Err(error) }
}
```

自定义 `catch` 可以用 `Ok(Some(value))` 恢复。在当前实验性适配器中，恢复得到的 `Ok(None)` 会表示为非终止结果，其值为 null；要重新抛出，请使用 `Err`，要恢复，请使用 `Ok(Some(...))`，并用 `return()`/显式类状态表示完成。

有关跨异步工作保留 JavaScript 错误的信息，请参阅[错误处理](/cn/docs/concepts/error-handling)。

## 生命周期与垃圾回收

对于异步迭代，`[Symbol.asyncIterator]()` 会创建一个迭代器对象，其中有一个指向原生类实例的隐藏、不可枚举、不可写引用。这可以防止在迭代器仍被保留时类被回收。迭代器对象终结时会释放该引用。

这个引用不会取消正在进行的 Rust future。Future 及其拥有的任何外部资源需要各自的取消和关闭设计。请让清理操作保持幂等，以便从 `complete`、显式类方法以及 `Drop`/终结路径安全调用。

同步迭代器就是类实例本身，因此普通的类实例可达性会让 Rust 值保持存活。

## 选择其他抽象

当每次请求自然地产生一个元素，且由消费者控制节奏时，使用迭代器。

- 对小型且已经物化的结果，使用普通数组或 `Vec<T>`。
- 对需要 Web Streams 背压和取消语义的流式传输，使用 `ReadableStream`。
- 对从 libuv worker pool 计算出的单个 CPU 密集结果，使用 `AsyncTask`。
- 对单个 Tokio future 和单个 Promise，使用异步函数。
- 对源自原生线程的重复回调，使用 ThreadsafeFunction。

由于迭代器支持仍处于实验阶段，当互操作性或长期 API 稳定性比迭代器语法更重要时，请优先使用这些已经成熟的抽象。

## 测试检查清单

- 带参数与不带参数的 `next()`。
- 自然完成，以及完成后的调用。
- 提前 `break`、显式 `return(value)` 与清理失败。
- 默认及恢复后的 `throw(error)` 行为。
- 如果 API 允许，测试两个重叠的异步 `next()` 调用。
- 删除原始异步类，只保留它的迭代器。
- 强制垃圾回收和 worker 环境关闭。
- 同时测试有全局 `Iterator` 辅助 API 与没有该 API 的运行时。
