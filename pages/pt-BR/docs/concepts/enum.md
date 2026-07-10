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

Em `TypeScript`, os membros de `enums` numéricos também recebem um mapeamento reverso dos valores do enum para os nomes do enum. Mas em Rust, não temos esse comportamento de mapeamento reverso. É apenas um objeto JavaScript simples.

As variantes numéricas usam por padrão valores `i32` consecutivos a partir de zero. Discriminantes inteiros Rust explícitos são preservados, e variantes implícitas posteriores continuam a partir do valor anterior.

## String enum

**lib.rs**

```rust
#[napi(string_enum)]
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
  Duck = 'Duck',
  Dog = 'Dog',
  Cat = 'Cat',
}
```

Use `string_enum = "case"` para transformar o nome de todas as variantes ou `#[napi(value = "...")]` em uma variante para escolher seu valor JavaScript exato. Os cases compatíveis estão listados na [referência de atributos `#[napi]`](/docs/concepts/napi-attributes#enums).

**lib.rs**

```rust
#[napi(string_enum = "kebab-case")]
pub enum AccessMode {
  ReadOnly,
  #[napi(value = "read-write")]
  Writable,
}
```

## Enum estruturado

Um enum com uma variante que contém dados se torna uma união discriminada de objetos, em vez de um objeto enum JavaScript.

**lib.rs**

```rust
#[napi]
pub enum Event {
  Ready,
  FileChanged { path: String },
  Progress(u32, u32),
}
```

**index.d.ts**

```ts
export type Event =
  | { type: 'Ready' }
  | { type: 'FileChanged'; path: string }
  | { type: 'Progress'; field0: number; field1: number }
```

O discriminador padrão é `type`. Altere-o com `discriminant = "kind"` e transforme os valores das variantes com `discriminant_case = "camelCase"` ou outro case compatível. Campos nomeados de variantes mantêm seus nomes; campos de tupla se tornam `field0`, `field1` e assim por diante. Um campo não pode ter o mesmo nome JavaScript do discriminador.

A conversão de enum estruturado é própria: aceitar um enum lê e converte seus campos em um valor enum Rust, enquanto retorná-lo cria um novo objeto JavaScript. `object_from_js = false` ou `object_to_js = false` pode tornar o tipo unidirecional. Consulte [Conversões de tipos](/docs/concepts/type-conversions#objects-classes-and-custom-shapes).

**NAPI-RS** não suporta a geração de `impl` de `enum` Rust em JavaScript.
