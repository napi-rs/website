---
description: Overwrite the argument and return TypeScript types.
---

# Types Overwrite

In most cases, **NAPI-RS** will generate the right TypeScript types for you. But in some scenarios, you may want to overwrite the arguments or return type.

[ThreadsafeFunction](./threadsafe-function) is an example, because the `ThreadsafeFunction` is too complex, **NAPI-RS** can't generate the right TypeScript types for it. You always need to overwrite its argument type.

## `ts_args_type`

Rewrite the arguments type of the function, **NAPI-RS** will put the rewritten type into the brace of the function signature.

```rust {1} filename="lib.rs"
#[napi(ts_args_type="callback: (err: null | Error, result: number) => void")]
fn call_threadsafe_function(callback: JsFunction) -> Result<()> {
  let tsfn: ThreadsafeFunction<u32, ErrorStrategy::CalleeHandled> = callback
    .create_threadsafe_function(0, |ctx| {
      ctx.env.create_uint32(ctx.value + 1).map(|v| vec![v])
    })?;
  for n in 0..100 {
    let tsfn = tsfn.clone();
    thread::spawn(move || {
      tsfn.call(Ok(n), ThreadsafeFunctionCallMode::Blocking);
    });
  }
  Ok(())
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts filename="index.d.ts"
export function callThreadsafeFunction(
  callback: (err: null | Error, result: number) => void,
): void
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
