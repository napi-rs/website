# Exportações

::: info
Ao contrário da definição de módulos no Node.js, não precisamos registrar explicitamente as exportações como `module.exports.xxx = xxx`.

O macro `#[napi]` irá gerar automaticamente o código de registro de módulo para você.
Essa ideia de registro automático foi inspirada pelo [node-bindgen](https://github.com/infinyon/node-bindgen).

:::

## `Function`

Exportar uma função é incrivelmente simples. Basta decorar uma função rust normal com `#[napi]`:

**lib.rs**

```rust
#[napi]
fn sum(a: u32, b: u32) -> u32 {
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

Veja a [`seção class`](./class) para mais detalhes.

**lib.rs**

```rust
#[napi(constructor)]
struct Animal {
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

Veja a [`seção enum`](./enum) para mais detalhes.

**lib.rs**

```rust
#[napi]
pub enum Kind {
  Dog,
  Cat,
  Duck,
}
```
