---
title: '函数 - Function'
---

# 函数 - Function

在 **NAPI-RS** 中定义一个 JavaScript“ `function` ”非常简单。只需要一个简单的 Rust `fn`:

```rust filename="lib.rs"
#[napi]
fn sum(a: u32, b: u32) -> u32 {
  a + b
}
```

你应该充分认识到 **\_NAPI-RS 函数不支持所有 Rust 类型\_\_**. 这里有一个表格来说明，当它们是' fn '参数和返回类型时，JavaScript 类型如何映射到 Rust 类型：

## 参数类型映射表 - Arguments

| Rust Type                                       | JavaScript Type                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `u32`                                           | `number`                                                                      |
| `i32`                                           | `number`                                                                      |
| `i64`                                           | `number`                                                                      |
| `f64`                                           | `number`                                                                      |
| `bool`                                          | `boolean`                                                                     |
| `String`                                        | `string`                                                                      |
| `Latin1String`                                  | `string`                                                                      |
| `UTF16String`                                   | `string`                                                                      |
| `#[napi(object)] struct`                        | `Object`                                                                      |
| `& struct` or `&mut struct`                     | [Class](./class) instance                                                     |
| `serde_json::Map`                               | `Object`                                                                      |
| `serde_json::Value`                             | `unknown`                                                                     |
| `std::collections::HashMap`                     | `Object`                                                                      |
| `Array`                                         | `unknown[]`                                                                   |
| `Vec<T>` 表中的 T 必须是一个类型                | T[]                                                                           |
| `Buffer`                                        | `Buffer`                                                                      |
| `External`                                      | [`External`](https://nodejs.org/api/n-api.html#napi_create_external)          |
| `Null`                                          | `null`                                                                        |
| `Undefined` / `()`                              | `undefined`                                                                   |
| `Option<T>`                                     | `T or null`                                                                   |
| `Fn(Arg) ->T` 表中的`Arg `and `T`必须是一个类型 | `(arg: Arg) => T`                                                             |
| `Promise<T>`                                    | `Promise<T>`                                                                  |
| `AbortSignal`                                   | [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) |
| `JsSymbol`                                      | `Symbol`                                                                      |
| `Int8Array` / `Uint8Array` / `Int16Array`...    | `TypedArray`                                                                  |
| `BigInt`                                        | `BigInt`                                                                      |

## 返回类型 - Return Type

| Rust Type                                    | JavaScript Type  |
| -------------------------------------------- | ---------------- |
| `u32`                                        | `number`         |
| `i32`                                        | `number`         |
| `i64`                                        | `number`         |
| `f64`                                        | `number`         |
| `bool`                                       | `boolean`        |
| `String`                                     | `string`         |
| `Latin1String`                               | `string`         |
| `UTF16String`                                | `string`         |
| `#[napi(object)] struct`                     | `Object`         |
| `#[napi] struct`                             | [Class](./class) |
| `serde_json::Map`                            | `Object`         |
| `serde_json::Value`                          | `unknown`        |
| `std::collections::HashMap`                  | `Object`         |
| `Array`                                      | `unknown[]`      |
| `Vec<T>` 表中的 T 必须是一个类型             | `T[]`            |
| `Buffer`                                     | `Buffer`         |
| `External`                                   | `External`       |
| `Null`                                       | `null`           |
| `Undefined` / `()`                           | `undefined`      |
| `Option<T>`                                  | `T` 或 `null`    |
| `AsyncTask<Task<JsValue = T>>`               | `Promise<T>`     |
| `JsSymbol`                                   | `Symbol`         |
| `Int8Array` / `Uint8Array` / `Int16Array`... | `TypedArray`     |
| `BigInt`                                     | `BigInt`         |
| `i64n`                                       | `BigInt`         |
| `i128`                                       | `BigInt`         |
| `u128`                                       | `BigInt`         |
