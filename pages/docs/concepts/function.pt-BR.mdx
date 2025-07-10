---
---

# Function

Definir uma `function` JavaScript é muito simples em **NAPI-RS**. Apenas uma simples Rust `fn`:

```rust filename="lib.rs"
#[napi]
fn sum(a: u32, b: u32) -> u32 {
  a + b
}
```

A coisa mais importante que você deve ter em mente é que **_as fn em NAPI-RS não suportam todos os tipos de Rust_**. Aqui está uma tabela para ilustrar como os tipos JavaScript se mapeiam para os tipos de Rust quando são argumentos e tipos de retorno de uma `fn`:

## Argumentos

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

## Tipo de Retorno

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
