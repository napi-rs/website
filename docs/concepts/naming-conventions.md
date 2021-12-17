---
title: 'Naming conventions'
---

## `snake_case` to `camelCase`

The code styles is very different between Rust and JavaScript. The Rust community is prefer the `snake_case` style variable while the JavaScript community is prefer the `camelCase` style. **NAPI-RS** will change the case of the Rust code to the `camelCase` style automatically.

```rust title=lib.rs
#[napi]
fn a_function(a_arg: u32) -> u32 {
  a_arg + 1
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export function aFunction(aArg: number): number
```

## `js_rename`

You can use the `js_rename` directive in `#[napi]` attribute to rename the JavaScript function.

```rust {1} title=lib.rs
#[napi(js_rename = "coolFunction")]
fn a_function(a_arg: u32) -> u32 {
  a_arg + 1
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export function coolFunction(aArg: number): number
```

The JavaScript function name will be `coolFunction`, both in the generated TypeScript definition and in the JavaScript runtime:

```js {1} title=test.mjs
import { coolFunction } from './index.js'

console.log(coolFunction(1)) // 2
```
