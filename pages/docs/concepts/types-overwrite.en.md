---
description: Overwrite the argument and return TypeScript types.
---

# Types Overwrite

In most cases, **NAPI-RS** will generate the right TypeScript types for you. But in some scenarios, you may want to overwrite the arguments or return type.

[ThreadsafeFunction](./threadsafe-function) is an example, because the `ThreadsafeFunction` is too complex, **NAPI-RS** can't generate the right TypeScript types for it in some cases. You always need to overwrite its argument type.

## `ts_args_type`

Rewrite the arguments type of the function, **NAPI-RS** will put the rewritten type into the brace of the function signature.

```rust {10} filename="lib.rs"
use std::sync::Arc;
use std::thread;

use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ThreadsafeCallContext, ThreadsafeFunctionCallMode},
};
use napi_derive::napi;

#[napi(ts_args_type = "callback: (err: null | Error, result: string) => void")]
pub fn call_threadsafe_function(callback: Function<u32, ()>) -> Result<()> {
  let tsfn_builder = callback.build_threadsafe_function();
  let tsfn = Arc::new(tsfn_builder.build_callback(
    move |ctx: ThreadsafeCallContext<Result<u32>>| Ok(format!("n: {}", ctx.value?)),
  )?);
  for n in 0..100 {
    let tsfn = tsfn.clone();
    thread::spawn(move || {
      tsfn.call(Ok(n), ThreadsafeFunctionCallMode::Blocking);
    });
  }
  Ok(())
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

```ts filename="index.d.ts"
export function callThreadsafeFunction(
  callback: (err: null | Error, result: string) => void,
): void
```

## `ts_arg_type`

Rewrite one or more argument types of a function _individually_, **NAPI-RS** will put the rewritten types into the brace of the function
signature and will auto-derive the other ones.

```rust {1} filename="lib.rs"
#[napi]
fn override_individual_arg_on_function(
  not_overridden: String,
  #[napi(ts_arg_type = "() => string")] f: Function,
  not_overridden2: u32,
) {
// code ...
}
```

```ts filename="index.d.ts"
export function overrideIndividualArgOnFunction(
  notOverridden: string,
  f: () => string,
  notOverridden2: number,
): string
```

## `ts_return_type`

Rewrite the return type of the function, **NAPI-RS** will add the rewritten type to the end of the function signature.

```rust {1} filename="lib.rs"
#[napi(ts_return_type="number")]
fn return_something_unknown(env: Env) -> Result<JsUnknown> {
  env.create_uint32(42).map(|v| v.into_unknown())
}
```

```ts filename="index.d.ts"
export function returnSomethingUnknown(): number
```

## `ts_type`

Overwrite the generated ts-type of a field in a struct.

```rust {1} filename="lib.rs"
#[napi(object)]
pub struct TsTypeChanged {
  #[napi(ts_type = "MySpecialString")]
  pub type_override: String,

  #[napi(ts_type = "object")]
  pub type_override_optional: Option<String>,
}
```

```ts filename="index.d.ts"
export interface TsTypeChanged {
  typeOverride: MySpecialString
  typeOverrideOptional?: object
}
```
