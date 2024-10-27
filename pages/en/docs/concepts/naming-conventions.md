---
title: 'Naming conventions'
---

# Naming conventions

## `snake_case` to `camelCase`

The code styles are very different between Rust and JavaScript. The Rust community prefers the `snake_case` style while the JavaScript community prefers the `camelCase` style. **NAPI-RS** will change the case of the Rust code to the `camelCase` style automatically.

```rust filename="lib.rs"
#[napi]
fn a_function(a_arg: u32) -> u32 {
  a_arg + 1
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts filename="index.d.ts"
export function aFunction(aArg: number): number
```

## `js_name`

You can use the `js_name` attribute in `#[napi]` to rename the JavaScript function.

```rust {1} filename="lib.rs"
#[napi(js_name = "coolFunction")]
fn a_function(a_arg: u32) -> u32 {
  a_arg + 1
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts filename="index.d.ts"
export function coolFunction(aArg: number): number
```

The JavaScript function name will be `coolFunction`, both in the generated TypeScript definition and in the JavaScript runtime:

```js {1} filename="test.mjs"
import { coolFunction } from './index.js'

console.log(coolFunction(1)) // 2
```
