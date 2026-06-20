---
title: 'Object'
---

# Object

`Object` é muito fácil de confundir com o uso de `Class`. Ao contrário de `Class`, você não pode atribuir `function` ou `method` a um `Object`.

**lib.rs**

```rust
#[napi(object)]
pub struct Pet {
  pub name: String,
  pub kind: u32,
}
```

Qualquer bloco `impl` desta `struct` não afetará o `Object` JavaScript.

::: warning
Se você quiser converter uma `struct` Rust em um `Object` JavaScript usando o
atributo `#[napi(object)]`, você precisa marcar todos os seus campos como
`pub`.

:::

Uma vez que a `struct` é marcada como `#[napi(object)]`, você pode usá-la como tipo de argumento de função ou tipo de retorno.

**lib.rs**

```rust
#[napi(object)]
pub struct Pet {
  pub name: String,
  pub kind: u32,
}

#[napi]
fn print_pet(pet: Pet) {
  println!("{}", pet.name);
}

#[napi]
fn create_cat() -> Pet {
  Pet {
    name: "cat".to_string(),
    kind: 1,
  }
}
```

::: warning
O objeto JavaScript passado para ou retornado de Rust é clonado. Isso
significa que qualquer mutação no `Object` do JavaScript não afetará a
`struct` Rust original. E qualquer mutação na `struct` Rust também não afetará
o `Object` JavaScript.

:::
