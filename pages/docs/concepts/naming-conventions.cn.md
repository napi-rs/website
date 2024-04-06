---
title: 'Naming conventions'
---

# 命名约定

## `snake_case` 转换为 `camelCase`

Rust 和 JavaScript 的代码风格有很大区别，Rust 社区更喜欢 `snake_case` 风格，而 JavaScript 社区更喜欢 `camelCase` 风格。**NAPI-RS** 会自动将 Rust 代码的风格转换为 `camelCase` 风格。

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

你可以在 `#[napi]` 中使用 `js_name` 属性来重命名 JavaScript 函数。

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

在生成的 Typescript 定义里和 Javascript 运行时里，函数名都是 `coolFunction`。

```js {1} filename="test.mjs"
import { coolFunction } from './index.js'

console.log(coolFunction(1)) // 2
```
