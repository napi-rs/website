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

## Custom Type Definitions in Header

When NAPI-RS generates `index.d.ts`, it includes a default header. You can customize this header to add your own TypeScript types, imports, or comments that your native module needs.

### Use Cases

- **Custom type aliases**: Define types like `MaybePromise<T>` used by your API
- **Import external types**: Import `ReadableStream`, `Buffer`, or other Node.js types
- **ESLint/TypeScript directives**: Add `// @ts-nocheck` or custom rules
- **Documentation**: Copyright notices, version info, or deprecation warnings
- **Declare symbols**: Export constants or symbols used by your bindings

### Configuration Options

| Method            | Location    | Best For                     |
| ----------------- | ----------- | ---------------------------- |
| `dtsHeaderFile`   | napi config | Complex headers with imports |
| `dtsHeader`       | napi config | Simple single-line additions |
| `--dts-header`    | CLI flag    | CI/CD overrides              |
| `--no-dts-header` | CLI flag    | Disable header entirely      |

### Priority Resolution

When multiple options are set, NAPI-RS resolves them in this order:

| Priority | Source                   | Description                                         |
| :------: | ------------------------ | --------------------------------------------------- |
|    1     | `dtsHeaderFile` (config) | File path in `napi` config - **always wins if set** |
|    2     | `--dts-header` (CLI)     | CLI flag overrides inline config                    |
|    3     | `dtsHeader` (config)     | Inline string in `napi` config                      |
|    4     | Default header           | Used when nothing else is specified                 |

> **Key point**: `dtsHeaderFile` in config takes precedence over ALL other options, including the `--dts-header` CLI flag. If you need CLI override capability, use `dtsHeader` instead of `dtsHeaderFile`.

### Example Scenarios

| Config `dtsHeaderFile` | Config `dtsHeader` | CLI `--dts-header` | Result               |
| :--------------------: | :----------------: | :----------------: | -------------------- |
|    `./header.d.ts`     |   `"type X = Y"`   |  `"// override"`   | Uses `./header.d.ts` |
|           -            |   `"type X = Y"`   |  `"// override"`   | Uses `"// override"` |
|           -            |   `"type X = Y"`   |         -          | Uses `"type X = Y"`  |
|           -            |         -          |         -          | Uses default header  |

### Using `dtsHeaderFile` (Recommended)

Create a separate `.d.ts` file for complex headers:

**Step 1: Create the header file**

```typescript filename="dts-header.d.ts"
/* auto-generated by NAPI-RS */
/* eslint-disable */

import type { ReadableStream } from 'node:stream/web'

type MaybePromise<T> = T | Promise<T>

export declare const MY_SYMBOL: symbol
```

**Step 2: Reference it in package.json**

```json filename="package.json"
{
  "napi": {
    "dtsHeaderFile": "./dts-header.d.ts"
  }
}
```

> ⚠️ The file content **completely replaces** the default header. Include the auto-generated comment and eslint directive if you want to keep them.

### Using `dtsHeader` (Inline)

For simple additions, use an inline string in your config:

```json filename="package.json"
{
  "napi": {
    "dtsHeader": "type MaybePromise<T> = T | Promise<T>"
  }
}
```

This completely replaces the default header. Include the auto-generated comment and eslint directive in the string if you want to keep them.

### CLI Options

**`--dts-header`**: Override the header via CLI (useful for CI/CD):

```sh
napi build --dts-header "// Custom header"
```

**`--no-dts-header`**: Generate `.d.ts` without any header:

```sh
napi build --no-dts-header
```

### Default Header

Without customization, NAPI-RS uses:

```typescript
/* auto-generated by NAPI-RS */
/* eslint-disable */
```
