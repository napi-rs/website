---
title: 'Object'
---

# Object

`Object` is very easy to confuse with the use of `Class`. Unlike `Class` you can't assign `function` or `method` to `Object`.

**lib.rs**

```rust
#[napi(object)]
pub struct Pet {
  pub name: String,
  pub kind: u32,
}
```

Any `impl` block of this `struct` will not affect the JavaScript `Object`.

::: warning
If you want to convert a Rust `struct` into JavaScript `Object` using
`#[napi(object)]` attribute, you need to mark all of its fields as `pub`.
:::

Once `struct` is marked as `#[napi(object)]`, you can use it as a function argument type or return type.

**lib.rs**

```rust
#[napi(object)]
pub struct Pet {
  pub name: String,
  pub kind: u32,
}

#[napi]
pub fn print_pet(pet: Pet) {
  println!("{}", pet.name);
}

#[napi]
pub fn create_cat() -> Pet {
  Pet {
    name: "cat".to_string(),
    kind: 1,
  }
}
```

::: warning
The JavaScript Object passed in or returned from Rust is cloned. This means
any mutation on JavaScript `Object` will not affect the original Rust
`struct`. And any mutation on Rust `struct` will not affect the JavaScript
`Object` either.
:::
