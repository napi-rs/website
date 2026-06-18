---
title: 'Inject This'
description: Inject This Object into functions and methods.
---

# Inject This

In class methods, you may want to access the raw `Object` value of the `Class` instance.

**lib.rs**

```rust {15}
use napi::{bindgen_prelude::*, JsObject};
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
  pub fn get_ref_count(&self, this: This<JsObject>) -> Result<Option<i32>> {
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

In functions, it may be bind with some objects in JavaScript:

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
  this.value + 1
}
```

**main.mjs**

```js {4}
import { Width, plusOne } from './index.js'

const width = new Width(1)
console.log(plusOne.call(width)) // 2
```
