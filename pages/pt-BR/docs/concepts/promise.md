---
title: 'Promise'
description: Promise JavaScript no Rust.
---

# Promise

## `Promise<T>`

Aguardar uma `Promise` JavaScript em Rust parece loucura, mas é viável em **NAPI-RS**.
A `Promise<T>` em **NAPI-RS** implementa o trait `std::future::Future`, então você pode usar a palavra-chave `await` para aguardá-la.

::: tip
Aguardar uma `Promise` JavaScript requer a feature `async` ou `tokio_rt`;
`tokio_rt` habilita `napi4` para você.

:::

::: info
`Promise<T>` é `Send` quando `T` é `Send`; assim, o compilador impede que um
valor resolvido não-`Send` atravesse threads worker do Tokio.

:::

**lib.rs**

```rust {5}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub async fn async_plus_100(p: Promise<u32>) -> Result<u32> {
  let v = p.await?;
  v.checked_add(100)
    .ok_or_else(|| Error::new(Status::InvalidArg, "result exceeds u32"))
}
```

**test.mjs**

```js {4}
import { asyncPlus100 } from './index.js'

const fx = 20
const result = await asyncPlus100(
  new Promise((resolve) => {
    setTimeout(() => resolve(fx), 50)
  }),
)

console.log(result) // 120
```

## `PromiseRaw<'env, T>`

`PromiseRaw<'env, T>` representa o valor `Promise` bruto no `JavaScript`; ele contém o lifetime, portanto só pode ser usado no contexto síncrono.

Mas, convenientemente, ele pode chamar métodos da Promise JavaScript, como `then`, `catch` e `finally`.

**lib.rs**

```rust {6}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn promise_callback(promise: PromiseRaw<u32>) -> Result<PromiseRaw<u32>> {
  promise.then(|ctx| Ok(ctx.value + 100))
}
```

**index.ts**

```js
import { promiseCallback } from './index.js'

const value = await promiseCallback(Promise.resolve(100))

console.log(value) // 200
```

## `AsyncBlock<T>`

`AsyncBlock<T>` é a outra forma de retornar uma `Promise` a partir do Rust. Enquanto uma [`async fn`](/pt-BR/docs/concepts/async-fn) exportada inicia quando o JavaScript a chama e resolve com o valor de retorno da função, um `AsyncBlock` envolve um future construído manualmente via `AsyncBlockBuilder` — que adicionalmente permite anexar um **hook de dispose** (`.with_dispose`) ou uma **closure de map** (`build_with_map`) que roda na thread JavaScript no momento da resolução, de modo que a promise pode resolver com valores que só podem ser criados lá (um `BufferSlice<'static>` zero-copy, uma instância de uma classe JavaScript, …). O future inicia imediatamente (eagerly) quando a função Rust é chamada, e não quando a promise é aguardada.

**lib.rs**

```rust
#[napi]
pub fn process_buffer(env: &Env, buffer: Buffer) -> Result<AsyncBlock<Buffer>> {
  AsyncBlockBuilder::new(async move { Ok(buffer) }).build(env)
}
```

**index.d.ts**

```ts
export declare function processBuffer(buffer: Buffer): Promise<Buffer>
```

Veja [Web Streams](/docs/concepts/streams#asyncblock-a-promise-with-a-dispose-hook) para a API completa do `AsyncBlockBuilder` e exemplos práticos, e [TypedArray](/pt-BR/docs/concepts/typed-array) para mais usos do `AsyncBlock` com buffers.
