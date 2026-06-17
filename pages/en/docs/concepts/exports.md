# Exports

::: info
Unlike defining modules in Node.js, we don't need to explicitly register exports like `module.exports.xxx = xxx`.

The `#[napi]` macro will automatically generate module registering code for you.
This auto registering idea was inspired by [node-bindgen](https://github.com/infinyon/node-bindgen).

:::

## `Function`

Exporting a function is incredibly simple. Just decorate a normal rust function with `#[napi]`:

**lib.rs**

```rust
#[napi]
pub fn sum(a: u32, b: u32) -> u32 {
	a + b
}
```

## `Const`

**lib.rs**

```rust
#[napi]
pub const DEFAULT_COST: u32 = 12;
```

**index.d.ts**

```ts
export const DEFAULT_COST: number
```

## `Class`

See [`class section`](./class) for more details.

**lib.rs**

```rust
#[napi(constructor)]
pub struct Animal {
  pub name: String,
  pub kind: u32,
}

#[napi]
impl Animal {
  #[napi]
  pub fn change_name(&mut self, new_name: String) {
    self.name = new_name;
  }
}
```

## `Enum`

See [`enum section`](./enum) for more details.

**lib.rs**

```rust
#[napi]
pub enum Kind {
  Dog,
  Cat,
  Duck,
}
```

## `exports` object

You can use the `#[napi(module_exports)]` attribute to access the `exports` object.

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(module_exports)]
pub fn exports(mut export: Object) -> Result<()> {
  let symbol = Symbol::for_desc("NAPI_RS_SYMBOL");
  export.set_named_property("NAPI_RS_SYMBOL", symbol)?;
  Ok(())
}
```
