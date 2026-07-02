---
title: 'Values'
description: Conversions between Rust and JavaScript types.
---

# Values

Conversions between Rust and JavaScript types.

### Undefined

Represent `undefined` in JavaScript.

**lib.rs**

```rust {3}
#[napi]
pub fn get_undefined() -> Undefined {
	()
}

// default return or empty tuple `()` are `undefined` after converted into JS value.
#[napi]
pub fn log(n: u32) {
	println!("{}", n);
}
```

**index.d.ts**

```ts
export function getUndefined(): undefined
export function log(n: number): void
```

### Null

Represents `null` value in JavaScript.

**lib.rs**

```rust {3}
#[napi]
pub fn get_null() -> Null {
	Null
}

#[napi]
pub fn get_env(env: String) -> Option<String> {
	match std::env::var(env) {
		Ok(val) => Some(val),
		Err(e) => None,
	}
}
```

**index.d.ts**

```ts
export function getNull(): null
export function getEnv(env: string): string | null
```

### Numbers

JavaScript `Number` type with Rust Int/Float types: `u32`, `i32`, `i64`, `f64`.

For Rust types like `u64`, `u128`, `i128`, checkout [`BigInt`](#bigint) section.

**lib.rs**

```rust
#[napi]
pub fn sum(a: u32, b: i32) -> i64 {
	(b + a as i32).into()
}
```

**index.d.ts**

```ts
export function sum(a: number, b: number): number
```

### String

Represents JavaScript `String` type.

**lib.rs**

```rust {3}
#[napi]
pub fn greet(name: String) -> String {
	format!("greeting, {}", name)
}
```

**index.d.ts**

```ts
export function greet(name: string): string
```

### Boolean

Represents JavaScript `Boolean` type.

**lib.rs**

```rust
#[napi]
pub fn is_good() -> bool {
	true
}
```

**index.d.ts**

```ts
export function isGood(): boolean
```

### Buffer

**lib.rs**

```rust
#[napi]
pub fn with_buffer(buf: Buffer) {
  let buf: Vec<u8> = buf.into();
  // do something
}

#[napi]
pub fn read_buffer(file: String) -> Buffer {
	Buffer::from(std::fs::read(file).unwrap())
}
```

**index.d.ts**

```ts
export function withBuffer(buf: Buffer): void
export function readBuffer(file: string): Buffer
```

### Object

Represents JavaScript anonymous object values.

::: warning
**Performance**

The costs of `Object` conversions between JavaScript and Rust are higher than other primitive types.

Every call of `Object.get("key")` is actually dispatched to node side including two steps: fetch value, convert JS to rust value, and so is `Object.set("key", v)`.

:::

**lib.rs**

```rust
#[napi]
pub fn keys(obj: Object) -> Vec<String> {
	Object::keys(&obj).unwrap()
}

#[napi]
pub fn log_string_field(obj: Object, field: String) {
	println!("{}: {:?}", &field, obj.get::<String>::(field.as_ref()));
}

#[napi]
pub fn create_obj(env: Env) -> Object {
	let mut obj = env.create_object().unwrap();
	obj.set("test", 1).unwrap();
	obj
}
```

**index.d.ts**

```ts
export function keys(obj: object): Array<string>
export function logStringField(obj: object): void
export function createObj(): object
```

If you want **NAPI-RS** to convert objects from JavaScript with the same shape defined in Rust, you can use the `#[napi]` macro with the `object` attribute.

**lib.rs**

```rust
/// #[napi(object)] requires all struct fields to be public
#[napi(object)]
pub struct PackageJson {
	pub name: String,
	pub version: String,
	pub dependencies: Option<HashMap<String, String>>,
	pub dev_dependencies: Option<HashMap<String, String>>,
}

#[napi]
pub fn log_package_name(package_json: PackageJson) {
	println!("name: {}", package_json.name);
}

#[napi]
pub fn read_package_json() -> PackageJson {
	// ...
}
```

**index.d.ts**

```ts
export interface PackageJson {
  name: string
  version: string
  dependencies: Record<string, string> | null
  devDependencies: Record<string, string> | null
}
export function logPackageName(packageJson: PackageJson): void
export function readPackageJson(): PackageJson
```

::: warning
**Clone over Reference**

The `#[napi(object)]` struct passed to a Rust `fn` is cloned from the **_JavaScript Object_**. Any mutation on it will not be reflected in the original **_JavaScript_** object.

:::

**lib.rs**

```rust
/// #[napi(object)] requires all struct fields to be public
#[napi(object)]
pub struct Animal {
	pub name: String,
}

#[napi]
pub fn change_animal_name(mut animal: Animal) {
  animal.name = "cat".to_string();
}
```

```js
const animal = { name: 'dog' }
changeAnimalName(animal)
console.log(animal.name) // "dog"
```

### Array

Because `Array` values in JavaScript can hold elements with different types, but Rust `Vec<T>`
can only contain elements of the same type, there are two different ways to handle array types.

::: warning
**Performance**

Because JavaScript `Array` type is actually backed by `Object`, the performance of manipulating `Array`s is the same as `Object`s.

The conversion between `Array` and `Vec<T>` is even heavier, which is in `O(n)` complexity.

:::

**lib.rs**

```rust
#[napi]
pub fn arr_len(arr: Array) -> u32 {
  arr.len()
}

#[napi]
pub fn get_tuple_array(env: Env) -> Array {
  let mut arr = env.create_array(2).unwrap();

  arr.insert(1).unwrap();
  arr.insert("test").unwrap();

  arr
}

#[napi]
pub fn vec_len(nums: Vec<u32>) -> u32 {
  u32::try_from(nums.len()).unwrap()
}

#[napi]
pub fn get_nums() -> Vec<u32> {
  vec![1, 1, 2, 3, 5, 8]
}
```

**index.d.ts**

```ts
export function arrLen(arr: unknown[]): number
export function getTupleArray(): unknown[]
export function vecLen(nums: Array<number>): number
export function getNums(): Array<number>
```

### BigInt

This requires the `napi6` feature.

::: warning
The only way to pass `BigInt` in `Rust` is using `BigInt` type. But you can
return `BigInt`, `i64n`, `u64`, `i128`, `u128`. Return `i64` will be treated
as `JavaScript` number, not `BigInt`.

:::

::: tip
The reason why Rust functions can't receive `i128` `u128` `u64` `i64n` as
arguments is that they may lose precision when converting JavaScript `BigInt`
into them. You can use `BigInt::get_u128`, `BigInt::get_i128`, etc. to get the
value in `BigInt`. The return value of these methods also indicates whether
precision is lost.

:::

**lib.rs**

```rust
/// the return value of `get_u128` is (signed: bool, value: u128, lossless: bool)
#[napi]
pub fn bigint_add(a: BigInt, b: BigInt) -> u128 {
  a.get_u128().1 + b.get_u128().1
}

#[napi]
pub fn create_big_int_i128() -> i128 {
  100
}
```

**index.d.ts**

```ts
export function bigintAdd(a: BigInt, b: BigInt): BigInt
export function createBigIntI128(): BigInt
```

### TypedArray

::: tip
Unlike JavaScript Object, the `TypedArray` passed into Rust fn is a
**Reference**. No data `Copy` or `Clone` will be performed. Every mutation on
the `TypedArray` will be reflected to the original JavaScript `TypedArray`.

:::

**lib.rs**

```rust
#[napi]
pub fn convert_u32_array(input: Uint32Array) -> Vec<u32> {
  input.to_vec()
}

#[napi]
pub fn create_external_typed_array() -> Uint32Array {
  Uint32Array::new(vec![1, 2, 3, 4, 5])
}

#[napi]
pub fn mutate_typed_array(mut input: Float32Array) {
  for item in input.as_mut() {
    *item *= 2.0;
  }
}
```

**index.d.ts**

```ts
export function convertU32Array(input: Uint32Array): Array<number>
export function createExternalTypedArray(): Uint32Array
export function mutateTypedArray(input: Float32Array): void
```

**test.mjs**

```js
import { convertU32Array, mutateTypedArray } from './index.js'

convertU32Array(new Uint32Array([1, 2, 3, 4, 5])) // [1, 2, 3, 4, 5]
mutateTypedArray(new Float32Array([1, 2, 3, 4, 5])) // Float32Array(5) [ 2, 4, 6, 8, 10 ]
```
