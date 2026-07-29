---
title: '函数'
description: 使用 NAPI-RS 在 Rust 中定义并调用 JavaScript 函数。
---

# 函数

在 **NAPI-RS** 中定义一个 JavaScript `function` 非常简单，只需要一个普通的 Rust `fn`：

**lib.rs**

```rust
#[napi]
pub fn sum(a: u32, b: u32) -> u32 {
  a + b
}
```

最重要的是，你需要记住 **_NAPI-RS fn 并不支持所有的 Rust 类型_**。每个参数类型都必须实现 `FromNapiValue`，每个返回类型都必须实现 `ToNapiValue`。

权威的转换矩阵——参数与返回类型、方向、所有权以及所需的 Cargo 特性——见[类型转换](/cn/docs/concepts/type-conversions)。针对函数的简要版本：

- 数字（`u32`、`i32`、`i64`、`f64`）、`bool` 和 `String` 在两个方向上都映射为对应的 JavaScript 类型。
- `Option<T>` 作为参数时接受 `T`、`null` 或 `undefined`（`T | null | undefined`）；作为返回类型时，`None` 会变成 `null`（`T | null`）。
- `Vec<T>`、元组、`HashMap` 和 `#[napi(object)]` 结构体映射为 JavaScript 数组和普通对象。
- `Buffer` 和各 typed-array 包装类型映射为 `Buffer` 和 `TypedArray`。
- `Function<Args, Return>` 和 `ThreadsafeFunction` 接受带完整类型签名的 JavaScript 回调（见下文）。
- `async fn` 或返回 `AsyncTask` 会映射为 `Promise<T>`。

## 返回类型

`#[napi] fn` 的返回类型通过 `ToNapiValue` 转换，并直接出现在生成的 `.d.ts` 中。返回 `Result<T>` 时，`Err` 会抛出异常，而不是产生一个值。完整的映射（包括 BigInt 输出类型 `i64n`、`i128`、`u128` 以及异步返回）参见[类型转换](/cn/docs/concepts/type-conversions)参考。

## 将 `Function` 作为参数

你可以把 `Function` 作为参数传给 `fn`：

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn call_function(callback: Function<u32, u32>) -> Result<u32> {
  callback.call(1)
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts
export declare function callFunction(callback: (arg: number) => number): number
```

::: info
你也可以在 Rust 侧创建 `Function`，参见 [`Env::create_function`](/cn/docs/concepts/env#create_function)

:::

## `FnArgs`

当参数个数超过 1 时，可以使用 `FnArgs` 来定义参数。

::: info
元组（`tuple`）类型可以通过调用 `.into()` 转换为 `FnArgs`。

:::

**lib.rs**

```rust {6}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn call_function_with_args(callback: Function<FnArgs<(u32, u32)>, u32>) -> Result<u32> {
  callback.call((1, 2).into())
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts
export declare function callFunctionWithArgs(
  callback: (arg1: number, arg2: number) => number,
): number
```

## `apply`

和 JavaScript 一样，你也可以使用 `apply`，以指定的 `this` 值来调用一个 `Function`。

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub struct RustClass {
  pub name: String,
}

#[napi]
impl RustClass {
  #[napi(constructor)]
  pub fn new(name: String) -> Self {
    Self { name }
  }
}

#[napi]
pub fn call_function_with_apply(
  this: ClassInstance<RustClass>,
  callback: Function<(), ()>,
) -> Result<()> {
  callback.apply(this, ())
}
```

**index.ts**

```ts
import { callFunctionWithApply, RustClass } from './index.js'

const rustClass = new RustClass('foo')

callFunctionWithApply(rustClass, function () {
  console.log(this.name) // foo
})
```

## `create_ref`

更多细节参见 [**Function Reference**](/cn/docs/concepts/reference#functionref)。

## `build_threadsafe_function`

你可以对 `Function` 调用 `build_threadsafe_function`，从它构建一个 `ThreadsafeFunction`。

`build_threadsafe_function` 的返回类型是 `ThreadsafeFunctionBuilder`。

默认情况下，`ThreadsafeFunctionBuilder` 会使用默认选项创建 `ThreadsafeFunction`：

::: info
选项的详细说明参见 [**ThreadsafeFunction**](/cn/docs/concepts/threadsafe-function)

:::

::: tip
由于你可以直接把 `ThreadsafeFunction` 和 `Arc<ThreadsafeFunction>` 传给 `#[napi] fn`，所以只有在需要动态创建 `ThreadsafeFunction` 时才使用 `build_threadsafe_function`。

:::

- `max_queue_size` 为 `0`
- `weak` 为 `false`
- `callee_handled` 为 `true`
- `error_status` 为 `napi::Status`

**lib.rs**

```rust
use napi::{bindgen_prelude::*, threadsafe_function::ThreadsafeFunctionCallMode};
use napi_derive::napi;

#[napi]
pub fn build_threadsafe_function_from_function(
  callback: Function<FnArgs<(u32, u32)>, u32>,
) -> Result<()> {
  let tsfn = callback.build_threadsafe_function().build()?;
  let jh = std::thread::spawn(move || {
    tsfn.call((1, 2).into(), ThreadsafeFunctionCallMode::NonBlocking);
  });

  Ok(())
}
```
