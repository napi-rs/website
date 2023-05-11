---
title: '命名规范'
---

# 命名规范

## `snake_case` 转 `camelCase`

Rust 和 JavaScript 的代码风格有着巨大的差别. 在 Rust 社区中 更喜欢 `snake_case` 风格的命名方式。但 JavaScript 社区中 `camelCase`风格更为流行。
**NAPI-RS** 将自动转换 Rust 代码为`camelCase`风格.

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

你可以使用`#[napi]`中的`js_name`属性对 JavaScript 导出的函数重命名.

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

无论是在自动生成的 TypeScript 定义文件还是 js 运行时，这个 JavaScript 函数名称都被修改成`coolFunction`:

```js {1} filename="test.mjs"
import { coolFunction } from './index.js'

console.log(coolFunction(1)) // 2
```
