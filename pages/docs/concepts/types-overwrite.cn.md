---
description: Overwrite the argument and return TypeScript types.
---

# 重写类型

在大多数情况下，**NAPI-RS** 会为你生成正确的 TypeScript 类型，但在某些情况下，你可能想要重写参数或返回值的类型。

[ThreadsafeFunction](./threadsafe-function) 是一个例子，因为 `ThreadsafeFunction` 太复杂了，**NAPI-RS** 无法为其生成正确的 TypeScript 类型。你总是需要重写它的参数类型。

## `ts_args_type`

重写函数的参数类型，**NAPI-RS** 会将重写的类型放在函数签名的括号中。

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

## `ts_arg_type`

_单独_ 重写函数的一个或多个参数类型，**NAPI-RS** 会将重写的类型放在函数签名的括号中，并自动推导其他类型。

```rust {1} filename="lib.rs"
#[napi]
fn override_individual_arg_on_function(
  not_overridden: String,
  #[napi(ts_arg_type = "() => string")] f: JsFunction,
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

重写函数的返回类型，**NAPI-RS** 会将重写的类型添加到函数签名的末尾。

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

覆盖结构体中字段生成的 ts 类型。

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
