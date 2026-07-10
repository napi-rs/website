---
title: '类型转换'
description: Rust 到 JavaScript 的转换矩阵、方向性、所有权与特性要求。
---

# 类型转换

每个导出参数都必须实现 `FromNapiValue`（或某个引用转换 trait），每个返回值都必须实现 `ToNapiValue`。生成的 TypeScript 类型是有用的文档，但真正决定转换是否可用的是 Rust trait 实现。

本参考描述 napi-rs v3 的 bindgen 运行时。有关 `JsString` 和 `JsObject` 等底层句柄，请参阅 [Env 与底层值](/cn/docs/concepts/env)。

## 方向图例

| 标记       | 含义                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------ |
| JS → Rust  | 该类型可用作导出函数的参数。                                                               |
| Rust → JS  | 该类型可以返回或赋给 JavaScript 值。                                                       |
| 作用域内   | Rust 值借用了 Node-API 环境或 JavaScript 回调作用域，不能逃逸出该作用域。                  |
| 拥有所有权 | 转换会创建或保留 Rust 拥有的数据；在满足该类型 `Send` 规则的前提下，它可以比回调存活更久。 |

::: warning
TypeScript 映射不代表两个转换方向都可用。例如，`u64` 会生成 `bigint`，但只能用于输出；
接受任意 JavaScript `bigint` 时应使用 `BigInt`，以便检查窄化转换是否无损。

:::

## 原始值

| Rust 类型                                       | JavaScript / TypeScript            | 方向      | 所有权与注意事项                                                                                                                                                                                                                          | 特性 / 最低 Node-API               |
| ----------------------------------------------- | ---------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `()` / `Undefined`                              | `undefined`；函数返回会变为 `void` | 双向      | 零大小标记。启用 `strict` 时，输入必须是 `undefined`。                                                                                                                                                                                    | 基础 API                           |
| `Null`                                          | `null`                             | 双向      | 显式 null 标记。普通输入转换会接受并丢弃任意值；启用 `strict` 时，输入必须是 `null`。                                                                                                                                                     | 基础 API                           |
| `bool`                                          | `boolean`                          | 双向      | 复制。                                                                                                                                                                                                                                    | 基础 API                           |
| `i8`、`u8`、`i16`、`u16`、`i32`、`u32`          | `number`                           | 双向      | 整数转换；JavaScript 仍以 Number 存储。                                                                                                                                                                                                   | 基础 API                           |
| `f32`                                           | `number`                           | Rust → JS | 会扩展为 JavaScript 双精度数；没有 `FromNapiValue` 实现。输入请使用 `f64`。                                                                                                                                                               | 基础 API                           |
| `f64`                                           | `number`                           | 双向      | JavaScript Number 是 IEEE-754 双精度浮点数。                                                                                                                                                                                              | 基础 API                           |
| `i64`                                           | `number`                           | 双向      | 使用 Node-API 的有符号 64 位 Number 转换。超出 JavaScript 安全整数范围的值可能丢失精度。                                                                                                                                                  | 基础 API                           |
| `BigInt`                                        | `bigint`                           | 双向      | 保留一个符号位和小端序 `u64` 字。其 getter 会报告窄化转换是否无损。                                                                                                                                                                       | `napi6`                            |
| `u64`、`u128`、`i128`、`usize`、`isize`、`i64n` | `bigint`                           | Rust → JS | 仅限输出，以免任意 JavaScript BigInt 被静默窄化。                                                                                                                                                                                         | `napi6`                            |
| `String`                                        | `string`                           | 双向      | 拥有所有权的 UTF-8 字符串。                                                                                                                                                                                                               | 基础 API                           |
| `&str`                                          | `string`                           | Rust → JS | 仅限借用的 Rust 输出；JavaScript 字符串不能作为 `&str` 传入。输入请使用 `String`。                                                                                                                                                        | 基础 API                           |
| `Utf16String`                                   | `string`                           | 双向      | 拥有 UTF-16 码元；适用于需要精确保留 UTF-16 表示的场景。                                                                                                                                                                                  | 基础 API                           |
| `Latin1String`                                  | `string`                           | 双向      | 拥有 Latin-1 字节。将其格式化为 UTF-8 需要 `latin1`。                                                                                                                                                                                     | 基础 API；解码/显示需要 `latin1`   |
| `OsString`、`PathBuf`                           | `string`                           | 双向      | 拥有所有权。Windows 使用 UTF-16 并保留未配对代理项。Unix 输出遇到非 Unicode 路径时会拒绝，而不会替换字节。                                                                                                                                | 基础 API                           |
| `&OsStr`、`&Path`                               | `string`                           | Rust → JS | 借用输出。平台注意事项与拥有所有权的形式相同。                                                                                                                                                                                            | 基础 API                           |
| `Symbol`                                        | `symbol`                           | 双向      | 普通输入转换会丢弃该值，不保留身份或描述。`#[napi(strict)]` 会先校验它确实是 symbol，但仍不会保留。返回 `Symbol` 时会根据 Rust 描述符状态创建一个 symbol。要保留现有值，请使用作用域内的 `JsSymbol`。`Symbol::for_desc` 需要 Node-API 9。 | 基础 API；全局 symbol 需要 `napi9` |

`i64` 特意映射到 `number`，而 `i64n` 映射到 `bigint`。只有当 JavaScript API 确实要暴露 BigInt 时，才应优先使用该包装类型。

**lib.rs**

```rust
#[napi]
pub fn inspect_bigint(value: BigInt) -> Result<u64> {
  let (negative, narrowed, lossless) = value.get_u64();
  if negative || !lossless {
    return Err(Error::from_reason("value does not fit in u64"));
  }
  Ok(narrowed)
}
```

上面的返回类型是 `bigint`，因为 `u64` 是 BigInt 输出类型。

## `Option`、`null` 与 `undefined` {#option-null-and-undefined}

`Option<T>` 有意采用非对称映射：

| 位置                                                                  | 接受或生成的 JavaScript                                                                                                                                                   | 生成的 TypeScript                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----- | ------------------------------------ |
| 函数参数                                                              | `T`、`null` 或 `undefined`；两个 nullish 值都会变为 `None`                                                                                                                | `T                                                | null  | undefined`，并且通常是可选的尾部参数 |
| 函数返回值                                                            | `Some(T)` 变为 `T`；`None` 变为 `null`                                                                                                                                    | `T                                                | null` |
| 使用默认 `use_nullable = false` 的 `#[napi(object)]` 或结构化形状字段 | 缺失或 `undefined` 变为 `None`；显式 `null` 会交给内部 `T` 转换，通常失败；输出时省略 `None`                                                                              | `field?: T`                                       |
| 使用 `use_nullable = true` 的 `#[napi(object)]` 或结构化形状字段      | 缺失或 `undefined` 会报错；`null` 变为 `None`；`None` 输出为 `null`                                                                                                       | `field: T                                         | null` |
| 公开类字段                                                            | 访问器始终存在。`Option` getter 对 `None` 输出 `null`，可写 setter 接受普通的 nullish `Option` 输入。`use_nullable` 改变生成的属性/构造函数形状，而不决定访问器是否存在。 | 默认：`field?: T`；启用 `use_nullable`：`field: T | null` |

当区分本身就是 API 的一部分时，请使用 `Null` 或 `Undefined`。只接受一种 nullish 值时，请使用 `Either<T, Null>` 或 `Either<T, Undefined>`。

**lib.rs**

```rust
#[napi]
pub fn optional_name(value: Option<String>) -> Option<String> {
  value.filter(|name| !name.is_empty())
}

#[napi]
pub fn null_but_not_undefined(value: Either<String, Null>) -> bool {
  matches!(value, Either::B(Null))
}
```

::: info
非尾部的可选参数可能会生成必需的联合类型，以确保其后的必需参数仍可在 TypeScript
中调用。该联合仍然接受 `undefined` 和 `null`。

:::

## 使用 `Either` 表示联合类型

`Either<A, B>` 一直到 `Either26<A, ..., Z>` 都会映射为 TypeScript 联合类型。输入时，napi-rs 按从左到右的顺序，用每个类型的 `ValidateNapiValue` 实现测试变体，然后转换第一个匹配项。

**lib.rs**

```rust
#[napi]
pub fn normalize_id(value: Either<u32, String>) -> String {
  match value {
    Either::A(number) => number.to_string(),
    Either::B(text) => text,
  }
}
```

**index.d.ts**

```ts
export function normalizeId(value: number | string): string
```

如果多个备选类型可能重叠，请从最具体到最宽泛排序。例如，普通 `Object` 的校验无法证明完整的对象 schema。`Either` 是运行时联合类型，并不是会在任意用户代码运行后回溯的 serde 风格无标签枚举。

## 数组、元组、map 与 set

| Rust 类型                             | JavaScript / TypeScript    | 方向                          | 转换行为                                                                                     | 特性              |
| ------------------------------------- | -------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------- | ----------------- |
| `Vec<T>`                              | `Array<T>`                 | 双向                          | 复制/转换每个元素。输入要求每个元素都实现 `FromNapiValue`。                                  | 基础 API          |
| `[T; N]`                              | `Array<T>`                 | Rust → JS                     | 创建 JavaScript 数组。                                                                       | 基础 API          |
| Rust 元组（不超过生成代码支持的元数） | TypeScript 元组 / JS Array | 双向                          | 输入长度必须至少等于元组长度；逐个转换索引元素。                                             | 基础 API          |
| `Array<'env>`                         | `unknown[]`                | JS → Rust，并可在作用域内透传 | 带 `get`、`get_ref`、`set` 和 `insert` 的作用域句柄；避免预先转换整个数组。                  | 基础 API          |
| `HashMap<K, V>`、`BTreeMap<K, V>`     | `Record<K, V>` / 普通对象  | 双向                          | 使用自身可枚举的字符串键属性。这**不是** JavaScript `Map`。键必须可以与字符串互相转换。      | 基础 API          |
| `IndexMap<K, V>`                      | `Record<K, V>` / 普通对象  | 双向                          | 使用同样的自身可枚举字符串键属性形状；在 JavaScript 属性规则允许的范围内保留 Rust 插入顺序。 | `object_indexmap` |
| `HashSet<T>`、`BTreeSet<T>`           | `Set<T>`                   | 双向                          | 构造或迭代真正的 JavaScript `Set`。                                                          | 基础 API          |
| `IndexSet<T>`                         | `Set<T>`                   | 双向                          | 保留插入顺序的 Rust set。                                                                    | `object_indexmap` |

`Vec<T>` 和集合转换的复杂度为 O(n)。如果需要增量访问而不是拥有所有权的副本，请使用作用域内的 `Array`、`Object`、typed-array 视图或 stream。

## 对象、类与自定义形状 {#objects-classes-and-custom-shapes}

| Rust 类型或声明                          | JavaScript / TypeScript           | 方向                                                       | 所有权 / 身份                                                                 |
| ---------------------------------------- | --------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `Object<'env>`                           | `object`                          | 作用域内双向                                               | 直接的作用域句柄。每次属性访问都会跨越 Node-API 边界。                        |
| `ObjectRef`                              | `object`                          | 双向                                                       | 持有 Node-API 引用，因此对象可以比回调存活更久。                              |
| `Unknown<'env>`                          | `unknown`                         | 作用域内双向                                               | 未检查的作用域句柄；请显式检查/强制转换。                                     |
| `#[napi(object)] struct`                 | 普通对象 / interface              | 由 `object_from_js` 和 `object_to_js` 控制，二者默认都启用 | JavaScript 输入会转换为新的、拥有所有权的 Rust 结构体。修改它不会修改源对象。 |
| `#[napi] struct`                         | JavaScript 类                     | 通过类引用和实例                                           | 保留原生类身份。方法接收 `&self`/`&mut self`；公开字段会成为访问器。          |
| `ClassInstance<'env, T>`                 | 类 `T` 的实例                     | JS → Rust / 作用域输出                                     | 当对象字段或集合需要 JavaScript 类实例本身时使用。                            |
| `#[napi(transparent)] struct Wrapper(T)` | 与 `T` 相同的表示                 | 按方向控制                                                 | Rust newtype，不创建 JavaScript 包装对象。                                    |
| `#[napi(array)]` 元组结构体              | JavaScript 数组 / TypeScript 元组 | 按方向控制                                                 | 有名称的 Rust 类型，使用位置式 JavaScript 表示。                              |
| 结构化 `#[napi] enum`                    | 可辨识对象联合                    | 按方向控制                                                 | 拥有所有权的转换；判别字段默认为 `type`。                                     |

不要把类当作对象形状。普通的可读写公开类字段需要为 getter 提供输出转换，并为 setter 提供输入转换；`readonly` 字段只需要输出转换，而跳过的类字段没有访问器。对于嵌套类值，请接受 `&T`、`ClassInstance<T>`，或使用 `Array::get_ref`；`Vec<T>` 需要拥有所有权的 `FromNapiValue` 实现，因此不适合接收类实例列表。

有关不同形状的示例，请参阅[类](/cn/docs/concepts/class)、[对象](/cn/docs/concepts/object)、[枚举](/cn/docs/concepts/enum)和 [`#[napi]` 属性](/cn/docs/concepts/napi-attributes)。

## Buffer、ArrayBuffer 与 typed array

| Rust 类型                                          | JavaScript / TypeScript | 方向                          | 生命周期与数据行为                                                                  | 特性 / 最低 Node-API                |
| -------------------------------------------------- | ----------------------- | ----------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------- |
| `BufferSlice<'env>`                                | Node.js `Buffer`        | 在同步作用域内双向            | 用于同步代码的可变借用视图。不要跨越 `await` 持有它。                               | 基础 API                            |
| `Buffer`                                           | Node.js `Buffer`        | 双向                          | 保留对 JavaScript 拥有的数据的引用，适用于异步使用。克隆后仍引用相同的底层 buffer。 | 使用 `napi4` 可获得最佳生命周期处理 |
| `ArrayBuffer<'env>`                                | `ArrayBuffer`           | JS → Rust，并可在作用域内透传 | 与环境绑定的借用字节。                                                              | 基础 API                            |
| `Int8Array`、`Uint8Array`、…                       | 对应的 typed array      | 双向                          | 拥有所有权/保留引用的包装类型，适用于异步使用。                                     | BigInt array 变体需要 `napi6`       |
| `Int8ArraySlice<'env>`、`Uint8ArraySlice<'env>`、… | 对应的 typed array      | 作用域内双向                  | 用于同步代码的借用视图。                                                            | BigInt array 变体需要 `napi6`       |
| `&[i8]`、`&[u8]`、`&[i16]`、…                      | 对应的 typed array      | 同步回调内 JS → Rust          | 借用切片；不能比回调存活更久。                                                      | BigInt 切片需要 `napi6`             |

当运行时接受外部后备存储时，外部 Buffer 和 ArrayBuffer 可以实现零拷贝。运行时也可能拒绝外部 buffer；此时 `BufferSlice::from_data` 等构造函数会回退为复制。不要承诺在所有 Node 兼容运行时上都能实现零拷贝。参阅 [Typed array](/cn/docs/concepts/typed-array) 和[理解生命周期](/cn/docs/concepts/understanding-lifetime)。

## Date 与 serde JSON

| Rust 类型                               | JavaScript / TypeScript                             | 方向           | 特性 / 注意事项                                                            |
| --------------------------------------- | --------------------------------------------------- | -------------- | -------------------------------------------------------------------------- |
| `Date` (`JsDate`)                       | `Date`                                              | 作用域内底层值 | `napi5`                                                                    |
| `chrono::DateTime<Tz>`、`NaiveDateTime` | `Date`                                              | 双向           | `chrono_date`，会启用 `chrono` 和 `napi5`；精度由自 epoch 起的毫秒数决定。 |
| `serde_json::Value`                     | 与 JSON 兼容的 JavaScript 值                        | 双向           | `serde-json`；拒绝函数、`undefined`、symbol 和 external 值。               |
| `serde_json::Map<String, Value>`        | 普通对象                                            | 双向           | `serde-json`                                                               |
| `serde_json::Number`                    | 根据值和启用的 API，可能是 Number、BigInt 或 string | 双向           | `serde-json`；启用 `napi6` 后，超出安全整数范围的整数会输出为 BigInt。     |

`serde_json::Value` 不能无损表示任意 JavaScript 值。特别是，大型输入 BigInt 在适合时可能变成 JSON number，否则变成十进制字符串。如果 BigInt 身份和精确的窄化规则很重要，请使用 `BigInt`。

`serde-json-ordered` 还会启用 serde_json 的 `preserve_order` 行为。

## 函数、Promise 与 stream

| Rust 类型                      | JavaScript / TypeScript  | 方向                                 | 生命周期 / 特性                                                                                                                                 |
| ------------------------------ | ------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `Function<'env, Args, Return>` | 有类型的 JavaScript 函数 | 作用域内 JS → Rust；可在作用域内透传 | 只能在其所属线程调用 JavaScript。多个位置参数请使用 `FnArgs<(...)>`。                                                                           |
| `FunctionRef<Args, Return>`    | 有类型的 JavaScript 函数 | JS → Rust / 保留引用                 | 拥有 Node-API 引用，但不实现 `ToNapiValue`。要传回 JavaScript，请调用 `borrow_back(env)` 获得作用域内 `Function`；仍只能在所属环境/线程中使用。 |
| `ThreadsafeFunction<...>`      | 有类型的回调             | JS → Rust，随后可从其他线程调用      | `napi4`；参阅 [ThreadsafeFunction](/cn/docs/concepts/threadsafe-function)。                                                                     |
| `Promise<T>`                   | `Promise<T>`             | 仅 JS → Rust                         | 可等待的 Rust future。正常导出的异步用法需要异步运行时。                                                                                        |
| `PromiseRaw<'env, T>`          | `Promise<T>`             | 作用域内 JS promise 句柄             | 支持 `then`、`catch` 和 `finally`，无需把 promise 移到其他线程。                                                                                |
| Rust `async fn` 返回值         | `Promise<T>`             | Rust → JS                            | `async` 或 `tokio_rt`；`Result::Err` 会 reject。                                                                                                |
| `AsyncTask<T>`                 | `Promise<T::JsValue>`    | Rust → JS                            | 在 libuv worker pool 中运行 `compute`。                                                                                                         |
| `ReadableStream<'env, T>`      | Web `ReadableStream<T>`  | 双向                                 | `web_stream`；构造要求 `T: Send + 'static`，且 Rust stream 也为 `Send + 'static`。                                                              |
| `WriteableStream<'env>`        | Web `WritableStream`     | JS → Rust，并可在作用域内透传        | `web_stream`；Rust API 目前拼写为 `WriteableStream`，类型生成器不会规范化该拼写，因此公开参数应使用 `ts_arg_type = "WritableStream"`。          |

`ReadableStream::new` 会检查运行时是否提供全局 `ReadableStream`。仅有 Node-API 4 并不保证 Web Streams 全局对象存在；`with_readable_stream_class` 可以显式接收兼容的构造函数。

## 外部原生数据

`External<T>` 向 JavaScript 暴露一个不透明、带类型标签的原生分配。它不会被序列化，生成的类型为 `ExternalObject<T>`。

- 返回拥有所有权的 `External<T>`，可将它转移到 JavaScript external 值中。
- 接受 `&External<T>` 或 `&mut External<T>`，可以借用并检查所包装值的类型。
- 当 Rust 必须持有指向 external 的 JavaScript 引用时，请使用 `ExternalRef<T>`。
- `External::new_with_size_hint` 会向 JavaScript 垃圾回收器报告原生分配大小；该数字是 GC 记账提示，不是内存限制。

有关生命周期细节，请参阅 [External](/cn/docs/concepts/external)。

## 校验不是强制转换

大多数生成的函数都根据其 `FromNapiValue` 实现执行转换。添加 `#[napi(strict)]` 后，会先调用 `ValidateNapiValue` 并拒绝顶层 JavaScript 类型不匹配的值。它不会把字符串强制转换为数字，也不会在转换前递归校验所有属性。

`#[napi(return_if_invalid)]` 执行相同的校验，但在输入无效时返回 `undefined`，而不是抛出异常。有关约束，请参阅 [`#[napi]` 属性](/cn/docs/concepts/napi-attributes)。

## 选择所有权模型

请按以下优先顺序选择：

1. 当复制成本可接受，且值必须跨线程或跨越 await 点时，使用拥有所有权的 Rust 值（`String`、`Vec<T>`、`#[napi(object)]`）。
2. 对同步的零拷贝或低拷贝访问，使用作用域句柄和切片（`Object<'env>`、`Array<'env>`、`BufferSlice<'env>`、typed-array 切片）。
3. 当 JavaScript 拥有的数据必须比回调存活更久时，使用保留引用的包装类型（`Buffer`、`ObjectRef`、`FunctionRef`、`Reference<T>`）。
4. 从其他线程调用 JavaScript 时使用 `ThreadsafeFunction`；绝不要把作用域 JavaScript 句柄移到那个线程。
5. 当数据应增量生成，而不是复制到一个集合中时，使用 stream。

编译器会通过生命周期和 `Send` 强制执行其中许多边界，但 `unsafe` 方法或原始 Node-API 句柄可以绕过这些限制。在这样做之前，请阅读[理解生命周期](/cn/docs/concepts/understanding-lifetime)。
