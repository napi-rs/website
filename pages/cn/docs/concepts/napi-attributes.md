---
title: '#[napi] 属性'
description: napi-derive 所有公开属性的源码依据参考。
---

# `#[napi]` 属性

`#[napi]` 宏用于导出 Rust 项，并控制它们在 JavaScript 运行时的行为以及生成的 TypeScript 声明。本页涵盖 `napi-derive` v3 接受的全部公开选项，包括两个只能在参数和枚举变体上解析的上下文特定选项。

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(js_name = "addOne", strict)]
pub fn add_one(value: u32) -> u32 {
  value + 1
}
```

::: info
运行时转换和 TypeScript 生成彼此独立。以 `ts_` 开头的选项以及
`skip_typescript` 只会改变 `napi-derive` 默认 `type-def` 特性生成的声明。
它们不会添加运行时校验或转换。

:::

## 支持的目标

在下表中：

- **函数**是指导出的自由函数。
- **方法**包括实例方法、静态方法、工厂方法、构造函数、getter 和 setter（前提是相应选项在该处有意义）。
- **类**是指以类身份导出的结构体。`object`、`array` 或 `transparent` 结构体属于值形状，而不是类。
- **字段**是指结构体字段或结构化枚举变体的字段。

启用默认的 `napi-derive/strict` 特性时，如果解析器接受了某个选项，但该选项没有用在对应种类的项上，编译就会报错。请优先使用本页记录的组合，不要依赖关闭 `strict` 后的行为。

## 命名与导出

| 选项                 | 有效目标                                             | 运行时效果                                                                                                        | TypeScript 效果                                                  | 特性 / 状态 |
| -------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------- |
| `js_name = "name"`   | 函数、方法、结构体、枚举、常量、类型别名、字段、模块 | 替换默认的 camelCase 函数/成员名或 PascalCase 类型名。用于 `mod` 时，为命名空间对象命名。类型别名没有运行时导出。 | 使用相同的导出名称；用于类型别名时，只重命名声明。               | 支持        |
| `namespace = "name"` | 函数、结构体、impl、枚举、常量、类型别名             | 将该项注册到 `exports.name` 下。类及其 `impl` 块应使用相同的命名空间。类型别名没有运行时注册。                    | 将声明放入同一个生成的命名空间中；用于类型别名时，这是唯一效果。 | 支持        |
| `module_exports`     | 仅自由函数                                           | 在模块初始化期间，以模块的 `exports` 对象运行该函数。                                                             | 不生成函数声明。                                                 | 支持        |
| `no_export`          | 仅自由函数                                           | 生成 Node-API 回调包装器，但不把函数注册到 `exports`。当你要把生成的 `*_c_callback` 传给底层 API 时，这很有用。   | 不生成声明。                                                     | 支持        |

内联 Rust 模块可以转换为 JavaScript 命名空间。只有同样带有 `#[napi]` 的子项会被导出，并且不支持嵌套 napi 模块。

**lib.rs**

```rust
#[napi(js_name = "math")]
mod arithmetic {
  #[napi]
  pub fn add(a: u32, b: u32) -> u32 {
    a + b
  }
}
```

**index.d.ts**

```ts
export namespace math {
  export function add(a: number, b: number): number
}
```

### `module_exports`

回调必须是非泛型自由函数。它只能接收 `Env`、`Object` 或它们的引用，并且只能返回 `()` 或 `Result<()>`。它不能与 `constructor`、`factory`、`getter`、`setter`、`js_name`、`strict`、`return_if_invalid` 或 `no_export` 组合使用。

**lib.rs**

```rust
#[napi(module_exports)]
pub fn initialize(mut exports: Object) -> Result<()> {
  exports.set("build", "release")?;
  Ok(())
}
```

如果初始化不需要 exports 对象，请参阅[模块初始化](/cn/docs/concepts/module-init)。

## 函数与方法

| 选项                        | 有效目标                                        | 运行时效果                                                                                      | TypeScript 效果                              | 特性 / 状态                       |
| --------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------- |
| `constructor`               | 返回 `Self`/`Result<Self>` 的方法；类结构体简写 | 暴露 JavaScript 构造函数。构造函数不能是异步的。用于结构体时，公开字段会成为构造函数参数。      | 生成 `constructor(...)`。                    | 支持                              |
| `factory`                   | 返回 `Self`/`Result<Self>` 的关联方法           | 暴露用于构造该类的静态工厂方法。它可以是异步的。                                                | 生成返回该类或 `Promise<Class>` 的静态方法。 | 支持                              |
| `getter` 或 `getter = name` | 方法                                            | 定义 JavaScript 属性 getter。不指定名称时，`get_value` 会变为 `value`。                         | 生成 `get` 访问器。                          | 支持                              |
| `setter` 或 `setter = name` | 方法                                            | 定义 JavaScript 属性 setter。不指定名称时，`set_value` 会变为 `value`。                         | 生成 `set` 访问器。                          | 支持                              |
| `strict`                    | 函数或方法                                      | 转换前对每个 JavaScript 参数调用 `ValidateNapiValue`，类型不匹配时抛出异常。                    | 无。                                         | 支持                              |
| `return_if_invalid`         | 函数或方法                                      | 执行校验，但参数无效时返回 `undefined`，而不是抛出异常。                                        | 无。                                         | 支持                              |
| `catch_unwind`              | 函数或方法                                      | 在生成的回调边界捕获正在展开的 Rust panic，并将其载荷转换为 JavaScript `Error`。                | 无。                                         | 需要支持展开的 panic 策略；支持   |
| `async_runtime`             | 同步函数或方法                                  | 启用 napi-rs Tokio 运行时时，在函数执行期间进入该运行时。未启用运行时时，包装器不执行任何操作。 | 无。                                         | 与 `napi/tokio_rt` 搭配使用；支持 |
| `enumerable = false`        | 方法                                            | 清除 enumerable 描述符标志。省略值等同于 `true`。                                               | 无。                                         | 支持                              |
| `writable = false`          | 方法                                            | 清除 writable 描述符标志。省略值等同于 `true`。                                                 | 无。                                         | 支持                              |
| `configurable = false`      | 方法                                            | 清除 configurable 描述符标志。省略值等同于 `true`。                                             | 无。                                         | 支持                              |

`strict` 与 `return_if_invalid` 互斥。它们校验 Rust 类型的 `ValidateNapiValue` 实现；不会执行任意的 schema 校验。嵌套 `Vec<T>` 的元素会逐个转换，即使最初的数组检查已通过，转换仍可能失败。

校验在生成的 JavaScript 回调中执行，早于异步 Rust future 的创建。
因此对于异步导出，`strict` 可能同步抛出异常，而 `return_if_invalid`
会对无效输入同步返回 `undefined`，而不是 Promise。这些属性不会改变生成的
异步返回类型，因此应明确记录这条特殊路径。

::: warning
`catch_unwind` 不是进程安全边界。它无法捕获会中止进程的 panic，而且 Rust
明确不保证每个 panic 都可以展开。预期内的失败应使用 `Result`。参阅[错误处理](/cn/docs/concepts/error-handling)。

:::

## 类与值形状

| 选项                                    | 有效目标                                | 运行时效果                                                                                                                                                                    | TypeScript 效果                                                 | 特性 / 状态                 |
| --------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------- |
| `object`                                | 结构体                                  | 将 JavaScript 对象转换为/转换自拥有所有权的 Rust 值。所有字段都必须公开。它不具备 JavaScript 类身份。                                                                         | 生成接口。                                                      | 支持                        |
| `array`                                 | 元组结构体                              | 将元组结构体转换为/转换自 JavaScript 数组。                                                                                                                                   | 生成元组类型。                                                  | 支持                        |
| `transparent`                           | 仅含一个字段的元组结构体                | 将转换委托给内部字段，而不是创建包装对象。                                                                                                                                    | 生成内部 TypeScript 类型的别名。                                | 支持                        |
| `object_from_js = false`                | object、array、transparent 结构体；枚举 | 不生成 `FromNapiValue`；该类型不能通过生成的转换从 JavaScript 传入。                                                                                                          | 无。                                                            | 支持                        |
| `object_to_js = false`                  | object、array、transparent 结构体；枚举 | 不生成 `ToNapiValue`；该类型不能通过生成的转换返回给 JavaScript。                                                                                                             | 无。                                                            | 支持                        |
| `use_nullable` 或 `use_nullable = true` | 类、object、array、结构化枚举           | 对 object 和结构化枚举字段，以 `null` 输出 `None`，而不是省略字段，并要求输入必须有该属性。对 array，会写入并要求元组索引，而不是留下或接受空位。类访问器和构造函数转换不变。 | 生成必需的 `T \| null` 属性或元组元素。用于类时，这是唯一效果。 | 支持；默认为 `false`        |
| `custom_finalize`                       | 类结构体                                | 阻止 napi-derive 生成默认的空 `ObjectFinalize` 实现，因此该类必须自行实现它。                                                                                                 | 无。                                                            | 支持                        |
| `iterator`                              | 类结构体                                | 使每个实例实现同步迭代器协议。                                                                                                                                                | 扩展 `Iterator<Yield, Return, Next>`。                          | **实验性**                  |
| `async_iterator`                        | 类结构体                                | 使每个实例实现异步迭代器协议。                                                                                                                                                | 添加 `[Symbol.asyncIterator](): AsyncGenerator<...>`。          | `napi/tokio_rt`；**实验性** |

方向控制是编译期控制：禁用一个方向会移除相应转换 trait 的实现。这适用于包含回调的仅输入形状，或包含无法从 JavaScript 读取的数据的仅输出形状。

**lib.rs**

```rust
#[napi(object, object_to_js = false)]
pub struct Request {
  pub path: String,
  pub on_chunk: ThreadsafeFunction<Buffer>,
}

#[napi(transparent)]
pub struct UserId(pub String);

#[napi(array)]
pub struct Point(pub f64, pub f64);
```

对于 object 或结构化枚举字段，默认模式会把缺失属性作为 `None`，并在输出时省略 `None`。已有属性会按内部类型 `T` 转换，所以并非所有 `T` 都接受 `null` 或 `undefined`。启用 `use_nullable = true` 后，属性变为必需；`Option<T>` 转换会把 `null` 作为 `None`，输出则使用 `null`，但仍会拒绝缺失或值为 `undefined` 的属性。array 对缺失元组索引与包含 `null` 的必需索引采用同样区别。对于类，访问器和结构体简写构造函数参数本来就使用普通 `Option<T>` 转换，getter 会为 `None` 返回 `null`；`use_nullable` 只改变生成的 TypeScript 形状。

### 字段 {#fields}

| 选项                                     | 有效目标               | 运行时效果                                                                                          | TypeScript 效果        | 特性 / 状态                            |
| ---------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------- |
| `js_name = "name"`                       | 结构体或结构化枚举字段 | 使用不同的 JavaScript 属性名。                                                                      | 使用重命名后的属性。   | 支持                                   |
| `skip`                                   | 类或值形状字段         | 用于类时，省略生成的属性访问器。值形状转换仍会读写该字段。                                          | 省略该字段。           | 支持；请参阅下方结构体简写构造函数限制 |
| `readonly`                               | 类或值形状字段         | 用于类时，只生成 getter，不生成 setter。它不会改变值形状转换。                                      | 添加 `readonly`。      | 支持                                   |
| `writable`、`enumerable`、`configurable` | 暴露的字段             | 控制类属性描述符标志。object 和结构化枚举输出始终使用 writable、enumerable、configurable 数据属性。 | 无。                   | 支持                                   |
| `ts_type = "..."`                        | 暴露的字段             | 无。                                                                                                | 替换推断出的字段类型。 | `napi-derive/type-def`                 |
| `skip_typescript`                        | 暴露的字段             | 运行时仍然存在该字段。                                                                              | 只从声明中省略该字段。 | `napi-derive/type-def`                 |

对于普通类，`skip` 会移除生成的 JavaScript 访问器，而 `skip_typescript` 会保留运行时访问器，只隐藏声明。对于 object、array 或结构化枚举，`skip` 和 `readonly` 会影响生成的声明，但运行时转换仍会处理该字段。不要将 `skip` 与 `#[napi(constructor)]` 结构体简写组合使用：生成的构造函数仍会消费所有字段，但 TypeScript 签名中没有被跳过的字段。

## 枚举 {#enums}

| 选项                             | 有效目标             | 运行时效果                             | TypeScript 效果                   | 特性 / 状态 |
| -------------------------------- | -------------------- | -------------------------------------- | --------------------------------- | ----------- |
| `string_enum`                    | 无字段枚举           | 将变体转换为字符串而不是整数值。       | 生成字符串值枚举成员。            | 支持        |
| `string_enum = "case"`           | 无字段枚举           | 使用所选大小写形式转换变体名称。       | 使用转换后的字符串值。            | 支持        |
| `value = "literal"`              | `string_enum` 的变体 | 覆盖某个变体的 JavaScript 字符串。     | 使用该字面值。                    | 支持        |
| `discriminant = "key"`           | 结构化枚举           | 将判别属性从默认的 `type` 改为指定键。 | 在可辨识联合中使用同一个属性。    | 支持        |
| `discriminant_case = "case"`     | 结构化枚举           | 改变变体名称在判别字段中的编码形式。   | 使用相同的编码值。                | 支持        |
| `use_nullable`                   | 结构化枚举           | 将 nullable 字段行为应用到变体字段。   | 控制可选字段与 `T \| null` 字段。 | 支持        |
| `object_from_js`、`object_to_js` | 任意枚举             | 启用或禁用某个方向的生成转换。         | 无。                              | 支持        |

接受的大小写名称为 `lowercase`、`UPPERCASE`、`PascalCase`、`camelCase`、`snake_case`、`UPPER_SNAKE`、`kebab-case` 和 `UPPER-KEBAB-CASE`。

**lib.rs**

```rust
#[napi(string_enum = "kebab-case")]
pub enum Mode {
  ReadOnly,
  #[napi(value = "read-write")]
  Writable,
}

#[napi(discriminant = "kind", discriminant_case = "camelCase")]
pub enum Event {
  Ready,
  FileChanged { path: String },
  Progress(u32, u32),
}
```

`string_enum` 只接受无字段变体，并且不能与显式 Rust 判别值组合使用。只要枚举包含任何携带数据的变体，它就是结构化枚举；每个变体都会成为带有判别字段及其自身字段的对象。JavaScript 名称与判别字段相同的字段会被拒绝。

## TypeScript 覆盖

| 选项                       | 有效目标                               | 声明效果                                                             | 重要约束                                                                                                                                                  |
| -------------------------- | -------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ts_arg_type = "..."`      | 单个函数参数                           | 替换该参数的推断类型。                                               | 上下文特定的参数属性。与函数级 `ts_args_type` 互斥。                                                                                                      |
| `ts_args_type = "..."`     | 函数或方法                             | 替换完整的、逗号分隔的参数列表。                                     | 与每个参数级 `ts_arg_type` 互斥。                                                                                                                         |
| `ts_return_type = "..."`   | 函数或方法                             | 替换推断出的返回类型。                                               | 对于异步函数，应包含完整的预期类型，通常为 `Promise<T>`。                                                                                                 |
| `ts_generic_types = "..."` | 函数或方法                             | 在参数前的 `<...>` 中添加文本。                                      | 字符串必须是有效的 TypeScript 泛型参数语法。                                                                                                              |
| `ts_type = "..."`          | 函数/方法或字段                        | 用于函数时，替换导出名称之后的整个签名后缀；用于字段时，替换其类型。 | 函数级 `ts_type` 不能与 `ts_args_type` 或 `ts_return_type` 组合使用。它也会替换泛型部分，因此应把泛型直接写进 `ts_type`，不要与 `ts_generic_types` 组合。 |
| `skip_typescript`          | 函数、方法、字段、枚举、常量、类型别名 | 保留运行时导出，但省略声明。类型别名没有运行时导出，所以会完全消失。 | 不能用于整个结构体或 `impl` 块。                                                                                                                          |

**lib.rs**

```rust
#[napi(
  ts_generic_types = "T",
  ts_args_type = "value: T",
  ts_return_type = "T"
)]
pub fn identity<'env>(value: Unknown<'env>) -> Unknown<'env> {
  value
}

#[napi(ts_type = "(operation: 'add' | 'subtract', a: number, b: number): number")]
pub fn calculate(operation: String, a: i32, b: i32) -> i32 {
  match operation.as_str() {
    "add" => a + b,
    "subtract" => a - b,
    _ => 0,
  }
}
```

这些字符串会直接插入生成的声明；napi-rs 不会把它们解析为 TypeScript，也不会验证它们是否描述了真实的运行时行为。请以运行时转换为准，并测试生成的 `.d.ts` 文件。

## 迭代器

`iterator` 与 `async_iterator` 互斥。生成器类不能暴露名为 `next`、`return` 或 `throw` 的公开字段，因为 napi-rs 会安装这些协议方法。有关所需 trait 和生命周期约束，请参阅[迭代器与异步迭代器](/cn/docs/concepts/iterators)。

## 选项索引

通用解析器接受以下选项：

`catch_unwind`、`async_runtime`、`module_exports`、`js_name`、`constructor`、`factory`、`getter`、`setter`、`readonly`、`enumerable`、`writable`、`configurable`、`skip`、`strict`、`return_if_invalid`、`object`、`object_from_js`、`object_to_js`、`custom_finalize`、`namespace`、`iterator`、`async_iterator`、`ts_args_type`、`ts_return_type`、`ts_type`、`ts_generic_types`、`string_enum`、`use_nullable`、`discriminant`、`discriminant_case`、`transparent`、`array`、`no_export` 和 `skip_typescript`。

上下文特定解析器还接受函数参数上的 `ts_arg_type`，以及字符串枚举变体上的 `value`。
