---
title: '导出'
description: 使用 NAPI-RS 控制 Rust 函数、类和常量如何导出到 JavaScript。
---

# 导出

::: info
与在 Node.js 中定义模块不同，我们不需要像 `module.exports.xxx = xxx` 这样显式注册导出。

`#[napi]` 宏会为你自动生成模块注册的代码，这种自动注册的方法是受 [node-bindgen](https://github.com/infinyon/node-bindgen) 启发而来。

:::

## `函数`

导出一个函数非常简单，只需使用 `#[napi]` 装饰一个普通的 rust 函数即可：

**lib.rs**

```rust
#[napi]
pub fn sum(a: f64, b: f64) -> f64 {
	a + b
}
```

## `常量`

**lib.rs**

```rust
#[napi]
pub const DEFAULT_COST: u32 = 12;
```

**index.d.ts**

```ts
export const DEFAULT_COST: number
```

## `类`

查看 [`类的介绍`](./class) 了解更多。

**lib.rs**

```rust
#[napi(constructor)]
pub struct Animal {
  pub name: String,
  pub kind: u32,
}

#[napi]
impl Animal {
  #[napi]
  pub fn change_name(&mut self, new_name: String) {
    self.name = new_name;
  }
}
```

## `枚举`

查看 [`枚举的介绍`](./enum) 了解更多。

**lib.rs**

```rust
#[napi]
pub enum Kind {
  Dog,
  Cat,
  Duck,
}
```

## `exports` 对象

你可以使用 `#[napi(module_exports)]` 属性来访问 `exports` 对象。

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(module_exports)]
pub fn exports(mut export: Object) -> Result<()> {
  let symbol = Symbol::new("NAPI_RS_SYMBOL");
  export.set_named_property("NAPI_RS_SYMBOL", symbol)?;
  Ok(())
}
```

## 命名空间 {#namespaces}

对于较大的 addon，你可以把相关的导出分组到嵌套的 JavaScript 模块对象中，而不是把所有内容都平铺到根 `exports` 上。有两种方式：

- `#[napi] mod name { ... }` —— 把一个内联 Rust 模块导出为命名空间。模块中每个同样带有 `#[napi]` 的子项都会被导出到该命名空间内（不支持嵌套的 napi 模块）。在 `mod` 上添加 `#[napi(js_name = "...")]` 可以重命名该命名空间对象。
- 在单个函数、类、impl 块、枚举、常量和类型别名上使用 `#[napi(namespace = "...")]` —— 把该项注册到 `exports.<namespace>` 下；类和它的 `impl` 块应使用相同的命名空间。参见[属性参考中的 `namespace`](/cn/docs/concepts/napi-attributes#naming-and-exports)。

权威示例是 [`examples/napi/src/js_mod.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/js_mod.rs)：

**lib.rs**

```rust
#[napi]
mod xxh3 {
  use napi::bindgen_prelude::{BigInt, Buffer};

  #[napi]
  pub const ALIGNMENT: u32 = 16;

  #[napi(js_name = "xxh3_64")]
  pub fn xxh64(input: Buffer) -> u64 {
    let mut h: u64 = 0;
    for i in input.as_ref() {
      h = h.wrapping_add(*i as u64);
    }
    h
  }

  #[napi]
  pub struct Xxh3 {
    inner: BigInt,
  }

  #[napi]
  impl Xxh3 {
    #[napi(constructor)]
    pub fn new() -> Xxh3 {
      // ...
    }
  }
}

#[napi]
mod xxh2 {
  use napi::bindgen_prelude::*;

  #[napi]
  pub fn xxh2_plus(a: u32, b: u32) -> u32 {
    a + b
  }
}
```

这些成员通过包导出上的命名空间对象来访问：

**index.ts**

```ts
import { xxh2, xxh3 } from './index.js'

xxh3.xxh3_64(Buffer.from('hello')) // function renamed with js_name
console.log(xxh3.ALIGNMENT) // 16
const hasher = new xxh3.Xxh3() // classes live inside the namespace too
xxh2.xxh2Plus(1, 2) // 3
```

而生成的 `.d.ts` 会用 `export declare namespace` 镜像这种嵌套结构：

**index.d.ts**

```ts
export declare namespace xxh2 {
  export function xxh2Plus(a: number, b: number): number
}

export declare namespace xxh3 {
  export class Xxh3 {
    constructor()
  }
  export const ALIGNMENT: number
  export function xxh3_64(input: Buffer): bigint
}
```
