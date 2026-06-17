---
description: Overwrite the argument and return TypeScript types.
---

# Sobrescrita de Tipos

Na maioria dos casos, o **NAPI-RS** irá gerar os tipos TypeScript corretos para você. Mas em alguns cenários, você pode querer sobrescrever o tipo dos argumentos ou o tipo de retorno.

[ThreadsafeFunction](./threadsafe-function) é um exemplo disso, porque `ThreadsafeFunction` é muito complexo,
o **NAPI-RS** não pode gerar os tipos TypeScript corretos para ele. Você sempre precisa sobrescrever o tipo de argumento.

## `ts_args_type`

Reescreva o tipo dos argumentos da função e o **NAPI-RS** colocará o tipo reescrito entre chaves na assinatura da função.

**lib.rs**

```rust {1}
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

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts
export function callThreadsafeFunction(
  callback: (err: null | Error, result: number) => void,
): void
```

## `ts_arg_type`

Reescreva um ou mais tipos de argumentos de uma função _individualmente_, e o **NAPI-RS** colocará os tipos reescritos entre chaves na assinatura da função e irá derivar automaticamente os outros.

**lib.rs**

```rust {1}
#[napi]
fn override_individual_arg_on_function(
  not_overridden: String,
  #[napi(ts_arg_type = "() => string")] f: JsFunction,
  not_overridden2: u32,
) {
// code ...
}
```

**index.d.ts**

```ts
export function overrideIndividualArgOnFunction(
  notOverridden: string,
  f: () => string,
  notOverridden2: number,
): string
```

## `ts_return_type`

Reescreva o tipo de retorno da função e o **NAPI-RS** adicionará o tipo reescrito ao final da assinatura da função.

**lib.rs**

```rust {1}
#[napi(ts_return_type="number")]
fn return_something_unknown(env: Env) -> Result<JsUnknown> {
  env.create_uint32(42).map(|v| v.into_unknown())
}
```

**index.d.ts**

```ts
export function returnSomethingUnknown(): number
```

## `ts_type`

Sobrescreva o tipo gerado do TypeScript de um campo em uma struct.

**lib.rs**

```rust {1}
#[napi(object)]
pub struct TsTypeChanged {
  #[napi(ts_type = "MySpecialString")]
  pub type_override: String,

  #[napi(ts_type = "object")]
  pub type_override_optional: Option<String>,
}
```

**index.d.ts**

```ts
export interface TsTypeChanged {
  typeOverride: MySpecialString
  typeOverrideOptional?: object
}
```
