---
---

# 函数

在 **NAPI-RS** 中定义一个 JavaScript `function` 非常简单，只需要一个普通的 Rust `fn`：

```rust filename="lib.rs"
#[napi]
fn sum(a: u32, b: u32) -> u32 {
  a + b
}
```

最重要的是，你需要记住 **_NAPI-RS fn 并不支持所有的 Rust 类型_**，
下面的表格说明了在 `fn` 参数和返回类型里，JavaScript 类型和 Rust 类型的映射关系：

## 参数

| Rust Type                                               | JavaScript Type                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `u32`                                                   | `number`                                                                      |
| `i32`                                                   | `number`                                                                      |
| `i64`                                                   | `number`                                                                      |
| `f64`                                                   | `number`                                                                      |
| `bool`                                                  | `boolean`                                                                     |
| `String`                                                | `string`                                                                      |
| `Latin1String`                                          | `string`                                                                      |
| `UTF16String`                                           | `string`                                                                      |
| `#[napi(object)] struct`                                | `Object`                                                                      |
| `& struct` or `&mut struct`                             | [Class](./class) instance                                                     |
| `serde_json::Map`                                       | `Object`                                                                      |
| `serde_json::Value`                                     | `unknown`                                                                     |
| `std::collections::HashMap`                             | `Object`                                                                      |
| `Array`                                                 | `unknown[]`                                                                   |
| `Vec<T>` T must be types in this table                  | T[]                                                                           |
| `Buffer`                                                | `Buffer`                                                                      |
| `External`                                              | [`External`](https://nodejs.org/api/n-api.html#napi_create_external)          |
| `Null`                                                  | `null`                                                                        |
| `Undefined` / `()`                                      | `undefined`                                                                   |
| `Option<T>`                                             | `T or null`                                                                   |
| `Fn(Arg) ->T` `Arg `and `T` must be types in this table | `(arg: Arg) => T`                                                             |
| `Promise<T>`                                            | `Promise<T>`                                                                  |
| `AbortSignal`                                           | [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) |
| `JsSymbol`                                              | `Symbol`                                                                      |
| `Int8Array` / `Uint8Array` / `Int16Array`...            | `TypedArray`                                                                  |
| `BigInt`                                                | `BigInt`                                                                      |

## 返回类型

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
| `Vec<T>` T must be types in this table       | `T[]`            |
| `Buffer`                                     | `Buffer`         |
| `External`                                   | `External`       |
| `Null`                                       | `null`           |
| `Undefined` / `()`                           | `undefined`      |
| `Option<T>`                                  | `T` or `null`    |
| `AsyncTask<Task<JsValue = T>>`               | `Promise<T>`     |
| `JsSymbol`                                   | `Symbol`         |
| `Int8Array` / `Uint8Array` / `Int16Array`... | `TypedArray`     |
| `BigInt`                                     | `BigInt`         |
| `i64n`                                       | `BigInt`         |
| `i128`                                       | `BigInt`         |
| `u128`                                       | `BigInt`         |
