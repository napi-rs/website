---
description: Inject This Object into functions and methods.
---

# Inject This

Nos métodos de classe, você pode querer acessar o valor bruto do `Object` da instância da `Class`.

```rust {15} filename="lib.rs"
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

```js {5} filename="main.mjs"
import { QueryEngine } from './index.js'

const qe = new QueryEngine()
qe.refCount = 3
console.log(qe.getRefCount()) // 3
```

Nas funções, elas podem ser vinculadas a alguns objetos em JavaScript:

```rust {10} filename="lib.rs"
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

```js {4} filename="main.mjs"
import { Width, plusOne } from './index.js'

const width = new Width(1)
console.log(plusOne.call(width)) // 2
```
