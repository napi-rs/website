---
---

# Function

Defining a JavaScript `function` is very simple in **NAPI-RS**. Just a plain Rust `fn`:

```rust filename="lib.rs"
#[napi]
fn sum(a: u32, b: u32) -> u32 {
  a + b
}
```

The most important thing you should keep in mind is **_NAPI-RS fn does not support every Rust type_**. Here is a table to illustrate how JavaScript types map to Rust types when they are `fn` arguments and return types:

## Arguments

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

## Return Type

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
