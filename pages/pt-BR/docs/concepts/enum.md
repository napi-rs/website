---
title: 'Enum'
description: Mapeie enums de Rust para uniões de strings e enums numéricos em JavaScript com NAPI-RS.
---

# Enum

::: warning
Não há `enum` no JavaScript, e o `enum` em Rust é muito diferente do `enum` em
TypeScript. Você precisa ler esta seção cuidadosamente antes de usar `enum` do
Rust em JavaScript.

:::

Em **NAPI-RS**, o `enum` do Rust é basicamente transformado em um simples objeto JavaScript.

**lib.rs**

```rust
#[napi]
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
  Duck,
  Dog,
  Cat,
}
```

Em `TypeScript`, os membros de `enums` numéricos também recebem um mapeamento reverso dos valores do enum para os nomes do enum. Mas em Rust, não temos esse comportamento de mapeamento reverso. É apenas um objeto JavaScript simples.

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

**NAPI-RS** não suporta a geração de `impl` de `enum` Rust em JavaScript.
