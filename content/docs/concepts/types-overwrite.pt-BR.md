---
description: Sobrescreva os tipos TypeScript de argumentos e retornos.
---

# Sobrescrita de tipos

Na maioria dos casos, o **NAPI-RS** gera os tipos TypeScript corretos a partir da assinatura Rust. Sobrescreva-os somente quando o contrato TypeScript público for intencionalmente diferente do tipo de conversão em tempo de execução e mantenha os dois comportamentos alinhados nos testes.

[ThreadsafeFunction](./threadsafe-function) é um exemplo: uma closure `build_callback` pode transformar dados Rust próprios em outra lista de argumentos do callback JavaScript, portanto a inferência nem sempre consegue descrever a assinatura final do callback.

## `ts_args_type`

Substitua a lista completa de parâmetros, separados por vírgulas, da função exportada. Isso altera somente a declaração gerada, não a conversão em tempo de execução.

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
  let tsfn = Arc::new(
    tsfn_builder
      .callee_handled::<true>()
      .build_callback(
        move |ctx: ThreadsafeCallContext<u32>| Ok(format!("n: {}", ctx.value)),
      )?,
  );
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

Substitua um ou mais tipos de parâmetro _individualmente_. O NAPI-RS continua inferindo os outros parâmetros.

```rust {1} filename="lib.rs"
#[napi]
fn override_individual_arg_on_function(
  not_overridden: String,
  #[napi(ts_arg_type = "() => string")] f: Function<(), String>,
  not_overridden2: u32,
) -> Result<String> {
  let value = f.call(())?;
  Ok(format!("{not_overridden}-{value}-{not_overridden2}"))
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

Substitua o tipo de retorno gerado. Para uma exportação assíncrona, forneça o tipo público completo, normalmente `Promise<T>`.

```rust {1} filename="lib.rs"
#[napi(ts_return_type="number")]
fn return_something_unknown<'env>(env: &'env Env) -> Result<Unknown<'env>> {
  env.create_uint32(42).map(|v| v.to_unknown())
}
```

```ts filename="index.d.ts"
export function returnSomethingUnknown(): number
```

## `ts_type`

Sobrescreva o tipo TypeScript gerado para um campo de uma struct.

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

## Definições de tipos personalizadas no cabeçalho

Quando o NAPI-RS gera `index.d.ts`, ele inclui um cabeçalho padrão. Você pode personalizar esse cabeçalho para adicionar tipos TypeScript, imports ou comentários necessários ao seu módulo nativo.

### Casos de uso

- **Aliases de tipo personalizados**: defina tipos usados por sua API, como `MaybePromise<T>`
- **Importação de tipos externos**: importe `ReadableStream`, `Buffer` ou outros tipos do Node.js
- **Diretivas ESLint/TypeScript**: adicione `// @ts-nocheck` ou regras personalizadas
- **Documentação**: avisos de copyright, informações de versão ou alertas de descontinuação
- **Declaração de symbols**: exporte constantes ou symbols usados pelos bindings

### Opções de configuração

| Método | Local | Mais indicado para |
| ----------------- | ----------- | ---------------------------- |
| `dtsHeaderFile` | Configuração napi | Cabeçalhos complexos com imports |
| `dtsHeader` | Configuração napi | Adições simples de uma linha |
| `--dts-header` | Flag da CLI | Sobrescritas em CI/CD |
| `--no-dts-header` | Flag da CLI | Desabilitar totalmente o cabeçalho |

### Resolução de prioridade

Quando várias opções estão definidas, o NAPI-RS as resolve nesta ordem:

| Prioridade | Origem | Descrição |
| :------: | ------------------------ | --------------------------------------------------- |
| 1 | `dtsHeaderFile` (configuração) | Caminho do arquivo na configuração `napi` — **sempre vence quando definido** |
| 2 | `--dts-header` (CLI) | A flag da CLI sobrescreve a configuração inline |
| 3 | `dtsHeader` (configuração) | String inline na configuração `napi` |
| 4 | Cabeçalho padrão | Usado quando nenhuma outra opção é especificada |

> **Ponto principal**: `dtsHeaderFile` na configuração tem precedência sobre TODAS as outras opções, incluindo a flag `--dts-header` da CLI. Se precisar permitir uma sobrescrita pela CLI, use `dtsHeader` em vez de `dtsHeaderFile`.

### Cenários de exemplo

| Configuração `dtsHeaderFile` | Configuração `dtsHeader` | CLI `--dts-header` | Resultado |
| :--------------------: | :----------------: | :----------------: | -------------------- |
| `./header.d.ts` | `"type X = Y"` | `"// override"` | Usa `./header.d.ts` |
| - | `"type X = Y"` | `"// override"` | Usa `"// override"` |
| - | `"type X = Y"` | - | Usa `"type X = Y"` |
| - | - | - | Usa o cabeçalho padrão |

### Usando `dtsHeaderFile` (recomendado)

Crie um arquivo `.d.ts` separado para cabeçalhos complexos:

**Etapa 1: crie o arquivo de cabeçalho**

```typescript filename="dts-header.d.ts"
/* auto-generated by NAPI-RS */
/* eslint-disable */

import type { ReadableStream } from 'node:stream/web'

type MaybePromise<T> = T | Promise<T>

export declare const MY_SYMBOL: symbol
```

**Etapa 2: referencie-o no package.json**

```json filename="package.json"
{
  "napi": {
    "dtsHeaderFile": "./dts-header.d.ts"
  }
}
```

> ⚠️ O conteúdo do arquivo **substitui completamente** o cabeçalho padrão. Inclua o comentário de geração automática e a diretiva eslint se quiser mantê-los.

### Usando `dtsHeader` (inline)

Para adições simples, use uma string inline na configuração:

```json filename="package.json"
{
  "napi": {
    "dtsHeader": "type MaybePromise<T> = T | Promise<T>"
  }
}
```

Isso substitui completamente o cabeçalho padrão. Inclua o comentário de geração automática e a diretiva eslint na string se quiser mantê-los.

### Opções da CLI

**`--dts-header`**: sobrescreve o cabeçalho pela CLI (útil para CI/CD):

```sh
napi build --dts-header "// Custom header"
```

**`--no-dts-header`**: gera o `.d.ts` sem nenhum cabeçalho:

```sh
napi build --no-dts-header
```

### Cabeçalho padrão

Sem personalização, o NAPI-RS usa:

```typescript
/* auto-generated by NAPI-RS */
/* eslint-disable */
```
