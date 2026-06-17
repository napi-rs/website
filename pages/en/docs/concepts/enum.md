---
title: 'Enum'
---

# Enum

::: warning
There is no `enum` in JavaScript, and Rust `enum` is very different from
TypeScript `enum`. You need to read this section carefully before you use Rust
`enum` in JavaScript.
:::

In **NAPI-RS**, Rust `enum` is basically transformed into a plain JavaScript Object.

**lib.rs**

```rust
#[napi]
pub enum Kind {
  Duck,
  Dog,
  Cat,
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts
export const enum Kind {
  Duck,
  Dog,
  Cat,
}
```

In `TypeScript`, numeric `enum` members also get a reverse mapping from enum values to enum names. However, in Rust, we don't have this reverse mapping behavior. It is just a plain JavaScript Object.

## String enum

**lib.rs**

```rust
#[napi(string_enum)]
enum Kind {
  Duck,
  Dog,
  Cat,
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts
export const enum Kind {
  Duck = 'Duck',
  Dog = 'Dog',
  Cat = 'Cat',
}
```

**NAPI-RS** doesn't support generating Rust `enum` `impl` into JavaScript.
