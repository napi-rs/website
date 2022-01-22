---
title: 'Enum'
---

:::caution
There is no `enum` in JavaScript, and Rust `enum` is very different from TypeScript `enum`. You need read this section carefully before you use Rust `enum` in JavaScript.
:::

In **NAPI-RS**, Rust `enum` is basically transformed into a plain JavaScript Object.

```rust title=lib.rs
#[napi]
enum Kind {
  Duck,
  Dog,
  Cat,
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export const enum Kind {
  Duck,
  Dog,
  Cat,
}
```

In `TypeScript`, numeric `enums` members also get a reverse mapping from enum values to enum names. But in Rust, we don't have this reverse mapping behaviour. It is just a plain JavaScript Object.

Also, **NAPI-RS** doesn't support generating Rust `enum` `impl` into JavaScript.
