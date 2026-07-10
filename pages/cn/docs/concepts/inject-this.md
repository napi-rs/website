---
title: '注入 This'
description: 给函数和方法注入 This 对象。
---

# 注入 This

在类方法中，您可能希望访问 `Class` 实例的原始 `Object` 值。

**lib.rs**

```rust {15}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub struct QueryEngine {}

#[napi]
impl QueryEngine {
  #[napi(constructor)]
  pub fn new() -> Result<Self> {
    Ok(Self {})
  }

  #[napi]
  pub fn get_ref_count(&self, this: This<'_>) -> Result<Option<i32>> {
    this.get::<i32>("refCount")
  }
}
```

**main.mjs**

```js {5}
import { QueryEngine } from './index.js'

const qe = new QueryEngine()
qe.refCount = 3
console.log(qe.getRefCount()) // 3
```

在函数中，它可能会绑定到 JavaScript 中的某些对象：

**lib.rs**

```rust {10}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(constructor)]
pub struct Width {
  pub value: i32,
}

#[napi]
pub fn plus_one(this: This<&Width>) -> i32 {
  this.object.value + 1
}
```

**main.mjs**

```js {4}
import { Width, plusOne } from './index.js'

const width = new Width(1)
console.log(plusOne.call(width)) // 2
```
