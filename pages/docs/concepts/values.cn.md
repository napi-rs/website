---
title: '值-Values'
description: Rust和JavaScript类型之间的转换.
---

# 值-Values

Rust 和 JavaScript 类型之间的转换.

### Undefined

在 JavaScript 中表示`undefined`。

```rust {3} filename="lib.rs"
#[napi]
fn get_undefined() -> Undefined {
	()
}

// 默认返回或空元组'()'在转换为JS值后是`undefined`。
#[napi]
fn log(n: u32) {
	println!("{}", n);
}
```

```ts filename="index.d.ts"
export function getUndefined(): undefined
export function log(n: number): void
```

### Null

在 JavaScript 中表示 `null` 值。

```rust {3} filename="lib.rs"
#[napi]
fn get_null() -> Null {
	Null
}

#[napi]
fn get_env(env: String) -> Option<String> {
	match std::env::var(env) {
		Ok(val) => Some(val),
		Err(e) => None,
	}
}
```

```ts filename="index.d.ts"
export function getNull(): null
export function getEnv(env: string): string | null
```

### Numbers

JavaScript `Number` 类型包含 Rust Int/Float 类型: `u32`, `i32`, `i64`, `f64`.

如果是 Rust `u64`, `u128`, `i128`类型, 请查看 [`BigInt`](#bigint) 章节.

```rust filename="lib.rs"
#[napi]
fn sum(a: u32, b: i32) -> i64 {
	(b + a as i32).into()
}
```

```ts filename="index.d.ts"
export function sum(a: number, b: number): number
```

### String

表示 JavaScript `String` 类型。

```rust {3} filename="lib.rs"
#[napi]
fn greet(name: String) -> String {
	format!("greeting, {}", name)
}
```

```ts filename="index.d.ts"
export function greet(name: string): string
```

### Boolean

表示 JavaScript `Boolean` 类型。

```rust filename="lib.rs"
#[napi]
fn is_good() -> bool {
	true
}
```

```ts filename="index.d.ts"
export function isGood(): boolean
```

### Buffer

```rust filename="lib.rs"
#[napi]
fn with_buffer(buf: Buffer) {
  let buf: Vec<u8> = buf.into();
  // do something
}

#[napi]
fn read_buffer(file: String) -> Buffer {
	Buffer::from(std::fs::read(file).unwrap())
}
```

```ts filename="index.d.ts"
export function withBuffer(buf: Buffer): void
export function readBuffer(file: string): Buffer
```

### 对象 - Object

表示 JavaScript 匿名对象值.

<Callout type="warning" emoji="⚠️">

**性能 - Performance**

JavaScript 和 Rust 之间 `Object` 转换的成本比其他基本类型要高。

每一次调用 `Object.get("key")`实际上都会被分发到 node 端，它包含两个步骤：取值，并将 JS 值转为 Rust 值。`Object.set("key", v)`与之类似。
</Callout>

```rust filename="lib.rs"
#[napi]
fn keys(obj: Object) -> Vec<String> {
	Object::keys(&obj).unwrap()
}

#[napi]
fn log_string_field(obj: Object, field: String) {
	println!("{}: {:?}", &field, obj.get::<String>::(field.as_ref()));
}

#[napi]
fn create_obj(env: Env) -> Object {
	let mut obj = env.create_object().unwrap();
	obj.set("test", 1).unwrap();
	obj
}
```

```ts filename="index.d.ts"
export function keys(obj: object): Array<string>
export function logStringField(obj: object): void
export function createObj(): object
```

如果你想用 **NAPI-RS** 转换看似与 JavaScript 相同的 Rust 结构定义，你可以用`#[napi]`宏的`object`属性

```rust filename="lib.rs"
/// #[napi(object)] 要求所有结构字段都是公共（public）的
#[napi(object)]
struct PackageJson {
	pub name: String,
	pub version: String,
	pub dependencies: Option<HashMap<String, String>>,
	pub dev_dependencies: Option<HashMap<String, String>>,
}

#[napi]
fn log_package_name(package_json: PackageJson) {
	println!("name: {}", package_json.name);
}

#[napi]
fn read_package_json() -> PackageJson {
	// ...
}
```

```ts filename="index.d.ts"
export interface PackageJson {
  name: string
  version: string
  dependencies: Record<string, string> | null
  devDependencies: Record<string, string> | null
}
export function logPackageName(packageJson: PackageJson): void
export function readPackageJson(): PackageJson
```

<Callout type="warning" emoji="⚠️">

**Clone over Reference**

在 Rust `fn` 中传递的 `#[napi(object)]` struct 是从 **_JavaScript Object_** 克隆的。它的任何变化都不会反映到原始的 **_JavaScript_** 对象。

</Callout>

```rust filename="lib.rs"
/// #[napi(object)] requires all struct fields to be public
#[napi(object)]
struct Animal {
	pub name: String,
}

#[napi]
fn change_animal_name(mut animal: Animal) {
  animal.name = "cat".to_string();
}
```

```js
const animal = { name: 'dog' }
changeAnimalName(animal)
console.log(animal.name) // "dog"
```

### 数组 - Array

因为 JavaScript 中的`Array`值可以包含不同类型的元素，但是 rust ' Vec<T> '只能包含相同类型的元素。所以数组类型有两种不同的方式。

<Callout type="warning" emoji="⚠️">

**性能 - Performance**

因为 JavaScript `Array` 类型实际上支持 `Object` ，所以操作 `Array` 的性能将与 `Object` 的性能相同。
`Array` 和 `Vec<T>` 之间的转换更加复杂，复杂度为' O(2n) '。

</Callout>

```rust filename="lib.rs"
#[napi]
fn arr_len(arr: Array) -> u32 {
  arr.len()
}

#[napi]
fn get_tuple_array(env: Env) -> Array {
  let mut arr = env.create_array(2).unwrap();

  arr.insert(1).unwrap();
  arr.insert("test").unwrap();

  arr
}

#[napi]
fn vec_len(nums: Vec<u32>) -> u32 {
  u32::try_from(nums.len()).unwrap()
}

#[napi]
fn get_nums() -> Vec<u32> {
  vec![1, 1, 2, 3, 5, 8]
}
```

```ts filename="index.d.ts"
export function arrLen(arr: unknown[]): number
export function getTupleArray(): unknown[]
export function vecLen(nums: Array<number>): number
export function getNums(): Array<number>
```

### BigInt

这需要`napi6` 的特性支持.

<Callout type="warning" emoji="⚠️">
在Rust中传递 `BigInt` 的唯一方法是使用 `BigInt` 类型。但是你可以返回 `BigInt`, `i64n`, `u64`, `i128`, `u128`。返回 `i64` 将被视为 `JavaScript` number，而不是`BigInt`。
</Callout>

<Callout>

Rust fn 不能接收 `i128` `u128` `u64` `i64n` 作为参数的原因是它们在将 JavaScript ' BigInt '转换为它们时可能会失去精度。你可以使用 `BigInt::get_u128` ， `BigInt::get_i128`...获取 `BigInt` 中的值。这些方法的返回值也表明了精度是否丢失。

The return value of these methods also indicates if precision is lost.

</Callout>

```rust filename="lib.rs"

/// the return value of `get_u128` is (signed: bool, value: u128, lossless: bool)
/// `get_u128` 的返回值为(signed: bool, value: u128, lossless: bool)

#[napi]
fn bigint_add(a: BigInt, b: BigInt) -> u128 {
  a.get_u128().1 + b.get_u128().1
}

#[napi]
fn create_big_int_i128() -> i128 {
  100
}
```

```ts filename="index.d.ts"
export function bigintAdd(a: BigInt, b: BigInt): BigInt
export function createBigIntI128(): BigInt
```

### TypedArray

<Callout>

与 JavaScript Object 不同，传入 Rust fn 的 `TypedArray` 是一个 **引用** 。不执行数据 `复制`或 `克隆` 。`TypedArray`上的每一个变化都会反映到原来的 JavaScript `TypedArray` 上。

</Callout>

```rust filename="lib.rs"
#[napi]
fn convert_u32_array(input: Uint32Array) -> Vec<u32> {
  input.to_vec()
}

#[napi]
fn create_external_typed_array() -> Uint32Array {
  Uint32Array::new(vec![1, 2, 3, 4, 5])
}

#[napi]
fn mutate_typed_array(mut input: Float32Array) {
  for item in input.as_mut() {
    *item *= 2.0;
  }
}
```

```ts filename="index.d.ts"
export function convertU32Array(input: Uint32Array): Array<number>
export function createExternalTypedArray(): Uint32Array
export function mutateTypedArray(input: Float32Array): void
```

```js filename="test.mjs"
import { convertU32Array, mutateTypedArray } from './index.js'

convertU32Array(new Uint32Array([1, 2, 3, 4, 5])) // [1, 2, 3, 4, 5]
mutateTypedArray(new Float32Array([1, 2, 3, 4, 5])) // Float32Array(5) [ 2, 4, 6, 8, 10 ]
```
