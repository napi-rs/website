---
title: '导出'
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
fn sum(a: u32, b: u32) -> u32 {
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
struct Animal {
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
