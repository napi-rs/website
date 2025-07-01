---
title: 'Naming conventions'
---

# Convenções de nomenclatura

## `snake_case` para `camelCase`

Os estilos de código são muito diferentes entre Rust e JavaScript. A comunidade Rust prefere o estilo `snake_case`, enquanto a comunidade JavaScript prefere o estilo `camelCase`. **NAPI-RS** irá automaticamente alterar o estilo do código Rust para o estilo `camelCase`.

```rust filename="lib.rs"
#[napi]
fn a_function(a_arg: u32) -> u32 {
  a_arg + 1
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

```ts filename="index.d.ts"
export function aFunction(aArg: number): number
```

## `js_name`

Você pode usar o atributo `js_name` em `#[napi]` para renomear a função JavaScript.

```rust {1} filename="lib.rs"
#[napi(js_name = "coolFunction")]
fn a_function(a_arg: u32) -> u32 {
  a_arg + 1
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

```ts filename="index.d.ts"
export function coolFunction(aArg: number): number
```

O nome da função JavaScript será `coolFunction`, tanto na definição TypeScript gerada quanto no tempo de execução JavaScript:

```js {1} filename="test.mjs"
import { coolFunction } from './index.js'

console.log(coolFunction(1)) // 2
```
