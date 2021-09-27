---
title: 'Exports'
---

:::info
Unlike defining modules in `Node.js`, we don't need to explicitly register exports like `module.exports.xxx = xxx`.

`#[napi]` macro will automatically generate module registering code for you.
The auto registering idea inspired by [node-bindgen](https://github.com/infinyon/node-bindgen)
:::

### `Function`

exports a function is incredibly simple. What you should do is just decorate a normal rust function with `#[napi]` macro:

```rust title=lib.rs
#[napi]
fn sum(a: u32, b: u32) -> u32 {
	a + b
}
```

### `Const`

```rust title=lib.rs
#[napi]
pub const DEFAULT_COST: u32 = 12;
```

```ts title=index.d.ts
export const DEFAULT_COST: number
```

### `Class`

See [`class section`](./class) for more details.

```rust title=lib.rs
#[napi(constructor)]
struct Animal {
  pub name: String
  pub kind: u32
}

#[napi]
impl Animal {
  #[napi]
  pub fn change_name(&mut self, new_name: String) {
    self.name = new_name;
  }
}
```

### `Enum`

See [`enum section`](./enum) for more details.

```rust title=lib.rs
#[napi]
pub enum Kind {
  Dog,
  Cat,
  Duck,
}
```
