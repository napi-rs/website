---
title: 'Values'
description: Conversions between Rust and JavaScript types.
---

# Values

Conversions between Rust and JavaScript types.

### Undefined

Represent `undefined` in JavaScript.

```rust {3} filename="lib.rs"
#[napi]
fn get_undefined() -> Undefined {
	()
}

// default return or empty tuple `()` are `undefined` after converted into JS value.
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

Represents `null` value in JavaScript.

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

JavaScript `Number` type with Rust Int/Float types: `u32`, `i32`, `i64`, `f64`.

For Rust types like `u64`, `u128`, `i128`, checkout [`BigInt`](#bigint) section.

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

Represents JavaScript `String` type.

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

Represents JavaScript `Boolean` type.

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

### Object

Represents JavaScript anonymous object values.

import { Callout } from 'nextra-theme-docs'

<Callout type="warning" emoji="⚠️">
**Performance**

The costs of `Object` conversions between JavaScript and Rust are higher than other primitive types.

Every call of `Object.get("key")` is actually dispatched to node side including two steps: fetch value, convert JS to rust value, and so as `Object.set("key", v)`.
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

If you want **NAPI-RS** to convert objects from JavaScript with the same shape defined in Rust, you can use the `#[napi]` macro with the `object` attribute.

```rust filename="lib.rs"
/// #[napi(object)] requires all struct fields to be public
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

The `#[napi(object)]` struct passed in Rust `fn` is cloned from **_JavaScript Object_**. Any mutation on it will not be reflected to the original **_JavaScript_** object.
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

### Array

Because `Array` values in JavaScript can hold elements with different types, but rust `Vec<T>`
can only contains same type elements. So there two different way for array types.

<Callout type="warning" emoji="⚠️">
**Performance**

Because JavaScript `Array` type is backed with `Object` actually, so the performance of manipulating `Array`s would be the same as `Object`s.

The conversion between `Array` and `Vec<T>` is even heavier, which is in `O(2n)` complexity.
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

This requires the `napi6` feature.

<Callout type="warning" emoji="⚠️">
The only way to pass `BigInt` in `Rust` is using `BigInt` type. But you can return `BigInt`, `i64n`, `u64`, `i128`, `u128`. Return `i64` will be treated as `JavaScript` number, not `BigInt`.
</Callout>

<Callout>
The reason why Rust fn can't receive `i128` `u128` `u64` `i64n` as arguments is that they may lose precision while converting JavaScript `BigInt` into them. You can use `BigInt::get_u128`, `BigInt::get_i128` ... to get the value in `BigInt`. The return value of these methods also indicates if precision is lost.
</Callout>

```rust filename="lib.rs"
/// the return value of `get_u128` is (signed: bool, value: u128, lossless: bool)
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
Unlike JavaScript Object, the `TypedArray` passed into Rust fn is a **Reference**. No data `Copy` or `Clone` will be performed. Every mutation on the `TypedArray` will be reflected to the original JavaScript `TypedArray`.
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
