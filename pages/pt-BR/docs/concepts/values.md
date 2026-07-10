---
title: 'Values'
description: Converta valores com segurança entre tipos Rust e JavaScript.
---

# Valores

Conversões entre tipos Rust e JavaScript.

Esta página apresenta valores comuns. Para consultar a matriz completa baseada no código-fonte — incluindo direção de conversão, propriedade, recursos do Cargo, `Option`, `Either`, coleções, caminhos, funções, Promises, streams e níveis do Node-API — veja [Conversões de tipos](/docs/concepts/type-conversions).

### Undefined

Representa `undefined` no JavaScript.

**lib.rs**

```rust {3}
#[napi]
fn get_undefined() -> Undefined {
	()
}

//  O retorno padrão ou a tupla vazia `()` são convertidos em `undefined` após serem convertidos em valor JavaScript.
#[napi]
fn log(n: u32) {
	println!("{}", n);
}
```

**index.d.ts**

```ts
export function getUndefined(): void
export function log(n: number): void
```

### Null

Representa o valor `null` em JavaScript.

**lib.rs**

```rust {3}
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

**index.d.ts**

```ts
export function getNull(): null
export function getEnv(env: string): string | null
```

`Option<T>` aceita `T`, `null` ou `undefined` como argumento, mas retorna `null` para `None`. Em um campo `#[napi(object)]`, a representação padrão é uma propriedade opcional, e `None` é omitido na saída; `#[napi(use_nullable)]` a transforma em uma propriedade obrigatória `T | null`. Consulte [`Option`, `null` e `undefined`](/docs/concepts/type-conversions#option-null-and-undefined) para o mapeamento completo, que depende da posição.

### Numbers

Tipo JavaScript `Number` com tipos Rust Int/Float: `u32`, `i32`, `i64`, `f64`.

Para tipos Rust como `u64`, `u128`, `i128`, confira a seção [`BigInt`](#bigint).

**lib.rs**

```rust
#[napi]
fn sum(a: u32, b: i32) -> i64 {
	i64::from(a) + i64::from(b)
}
```

**index.d.ts**

```ts
export function sum(a: number, b: number): number
```

### String

Representa o tipo `String` do JavaScript.

**lib.rs**

```rust {3}
#[napi]
fn greet(name: String) -> String {
	format!("greeting, {}", name)
}
```

**index.d.ts**

```ts
export function greet(name: string): string
```

### Boolean

Representa o tipo `Boolean` do JavaScript.

**lib.rs**

```rust
#[napi]
fn is_good() -> bool {
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
fn with_buffer(buf: Buffer) {
  let buf: Vec<u8> = buf.into();
  // faz alguma coisa
}

#[napi]
fn read_buffer(file: String) -> Result<Buffer> {
	Ok(std::fs::read(file)?.into())
}
```

**index.d.ts**

```ts
export function withBuffer(buf: Buffer): void
export function readBuffer(file: string): Buffer
```

### Object

Representa valores de objeto anônimo do JavaScript.

::: warning
**Desempenho**

Os custos de conversão de `Object` entre JavaScript e Rust são maiores do que outros tipos primitivos.

Cada chamada de `Object.get("key")` é na verdade despachada para o lado do node, incluindo duas etapas: buscar valor, converter JS para valor de Rust, e o mesmo vale para `Object.set("key", v)`.

:::

**lib.rs**

```rust
#[napi]
pub fn keys(obj: Object) -> Result<Vec<String>> {
	Object::keys(&obj)
}

#[napi]
pub fn log_string_field(obj: Object, field: String) -> Result<()> {
	println!("{}: {:?}", &field, obj.get::<String>(&field)?);
	Ok(())
}

#[napi]
pub fn create_obj(env: &Env) -> Result<Object> {
	let mut obj = Object::new(env)?;
	obj.set("test", 1)?;
	Ok(obj)
}
```

**index.d.ts**

```ts
export function keys(obj: object): Array<string>
export function logStringField(obj: object, field: string): void
export function createObj(): object
```

Se você deseja que o **NAPI-RS** converta objetos do JavaScript com a mesma forma definida em Rust, você pode usar o macro `#[napi]` com o atributo `object`.

**lib.rs**

```rust
use std::collections::HashMap;

/// #[napi(object)] requer que todos os campos da struct sejam públicos
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
pub fn example_package_json() -> PackageJson {
	PackageJson {
		name: "example".to_owned(),
		version: "1.0.0".to_owned(),
		dependencies: None,
		dev_dependencies: None,
	}
}
```

**index.d.ts**

```ts
export interface PackageJson {
  name: string
  version: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}
export function logPackageName(packageJson: PackageJson): void
export function examplePackageJson(): PackageJson
```

::: warning
**Clone sobre Referência**

A estrutura `#[napi(object)]` passada na função Rust `fn` é clonada do **_JavaScript Object_**. Qualquer mutação nela não será refletida no objeto **_JavaScript_**.

:::

`#[napi(object)]` é uma forma de objeto simples e própria, não uma classe. Use `#[napi] struct` para identidade e métodos de classe nativa, `#[napi(transparent)]` para um newtype Rust com a representação JavaScript do valor interno ou `#[napi(array)]` para um array em forma de tupla. Consulte [Conversões de tipos](/docs/concepts/type-conversions#objects-classes-and-custom-shapes).

**lib.rs**

```rust
/// #[napi(object)] requer que todos os campos da struct sejam públicos
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

Porque os valores de `Array` em JavaScript podem conter elementos com tipos diferentes, mas `Vec<T>`
em Rust só pode conter elementos do mesmo tipo. Portanto, existem duas maneiras diferentes para os tipos de array.

::: warning
**Desempenho**

Como o tipo `Array` do JavaScript é realmente suportado por `Object`, o desempenho de manipulação de `Array`s seria o mesmo que o de `Object`s.

A conversão entre `Array` e `Vec<T>` é ainda mais pesada, com complexidade `O(n)`.

:::

**lib.rs**

```rust
#[napi]
fn arr_len(arr: Array) -> u32 {
  arr.len()
}

#[napi]
fn get_tuple_array(env: &Env) -> Result<Array> {
  let mut arr = env.create_array(2)?;

  arr.insert(1)?;
  arr.insert("test")?;

  Ok(arr)
}

#[napi]
fn vec_len(nums: Vec<u32>) -> Result<u32> {
  u32::try_from(nums.len())
    .map_err(|_| Error::new(Status::InvalidArg, "Array is too large"))
}

#[napi]
fn get_nums() -> Vec<u32> {
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

Isso requer o recurso `napi6`.

::: warning
A única maneira de passar `BigInt` em `Rust` é usando o tipo `BigInt`. Mas
você pode retornar `BigInt`, `i64n`, `u64`, `i128`, `u128`. Retornar `i64`
será tratado como um número `JavaScript`, não `BigInt`.

:::

::: tip
A razão pela qual as funções Rust não podem receber `i128` `u128` `u64` `i64n`
como argumentos é que eles podem perder precisão ao converter `BigInt` do
JavaScript para eles. Você pode usar `BigInt::get_u128`, `BigInt::get_i128`
... para obter o valor em `BigInt`. O valor de retorno desses métodos também
indica se houve perda de precisão.

:::

**lib.rs**

```rust
/// O valor de retorno de `get_u128` é (signed: bool, value: u128, lossless: bool)
#[napi]
pub fn bigint_add(a: BigInt, b: BigInt) -> Result<u128> {
  let (a_signed, a_value, a_lossless) = a.get_u128();
  let (b_signed, b_value, b_lossless) = b.get_u128();
  if a_signed || b_signed || !a_lossless || !b_lossless {
    return Err(Error::new(
      Status::InvalidArg,
      "both values must be lossless, non-negative u128 integers",
    ));
  }
  a_value.checked_add(b_value).ok_or_else(|| {
    Error::new(Status::InvalidArg, "u128 addition overflowed")
  })
}

#[napi]
pub fn create_big_int_i128() -> i128 {
  100
}
```

**index.d.ts**

```ts
export function bigintAdd(a: bigint, b: bigint): bigint
export function createBigIntI128(): bigint
```

### TypedArray

::: tip
Ao contrário do objeto JavaScript, o `TypedArray` passado para a função Rust é
uma **Referência**. Nenhum dado `Copy` ou `Clone` será realizado. Toda mutação
no `TypedArray` será refletida no `TypedArray` JavaScript original.

:::

**lib.rs**

```rust
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
  for item in unsafe { input.as_mut() } {
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
const values = new Float32Array([1, 2, 3, 4, 5])
mutateTypedArray(values)
console.log(values) // Float32Array(5) [ 2, 4, 6, 8, 10 ]
```
