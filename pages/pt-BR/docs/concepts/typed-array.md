---
title: 'TypedArray'
description: Transfira TypedArray, Buffer e memória externa com segurança entre Rust e JavaScript.
---

# TypedArray

`TypedArray` descreve uma visualização semelhante a um array sobre um
[buffer de dados binários](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer).
O NAPI-RS pode expor esse armazenamento ao Rust sem copiá-lo, sujeito às regras
de lifetime e sincronização abaixo.

## Buffer

[`Buffer`](https://nodejs.org/api/buffer.html) é uma subclasse do [`Uint8Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) do JavaScript. É frequentemente usado para compartilhar dados entre Node.js e Rust.

Um `Buffer` pode ser criado a partir de `Vec<u8>`. Quando o runtime permite
buffers externos, o NAPI-RS transfere a alocação para o `Buffer` JavaScript sem
copiá-la, e seu finalizer libera o `Vec<u8>` depois que o JavaScript coleta o
buffer. Se o runtime rejeitar buffers externos, o NAPI-RS copia os bytes para
um buffer pertencente ao runtime.

**lib.rs**

```rust {6}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn create_buffer() -> Buffer {
  vec![0, 1, 2].into()
}
```

::: info
Em runtimes que aceitam buffers externos, o `Vec<u8>` subjacente não é
copiado dessa maneira.

:::

::: warning
O `Electron` não consegue criar `Buffer` de forma zero-copy. Veja o [V8 Memory
Cage](https://www.electronjs.org/blog/v8-memory-cage) para mais detalhes.
Nesse caso, o **NAPI-RS** copia os dados do `Vec<u8>` para o `Buffer`
subjacente.

:::

## Tipos de Buffer e TypedArray

**NAPI-RS** fornece duas categorias de tipos de buffer para diferentes casos de uso. Para mais detalhes sobre como os lifetimes funcionam para esses tipos, consulte [Entendendo lifetime](/docs/concepts/understanding-lifetime#lifetime-de-buffer-e-typedarray).

### Tipos com ownership (Owned Types)

Esses tipos podem sobreviver à chamada nativa atual e atravessar fronteiras
assíncronas:

- `Buffer` — wrapper de Buffer do Node.js baseado em referência
- `Uint8Array`, `Int32Array`, `Float64Array`, etc. — wrappers de typed array com ownership

Para um valor recebido do JavaScript, o NAPI-RS cria um [`napi_ref`](https://nodejs.org/api/n-api.html#napi_create_reference) que mantém o objeto JavaScript e seu armazenamento subjacente vivos até o wrapper Rust ser descartado. Descartar o wrapper só libera a referência do Rust; o JavaScript ainda pode manter o mesmo objeto de forma independente.

**lib.rs**

```rust {5}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn process_buffer(env: &Env, buffer: Buffer) -> Result<AsyncBlock<Buffer>> {
  // Copie enquanto o callback síncrono do JavaScript ainda tem o controle.
  let mut data = buffer.to_vec();
  AsyncBlockBuilder::new(async move {
    data.reverse();
    Ok(data.into())
  })
  .build(env)
}
```

::: info
`AsyncBlock` e `AsyncBlockBuilder` são reexportados sob a feature `async` do
napi, então este exemplo não compila sem ela. Ative a feature na dependência
`napi` do seu `Cargo.toml`:
`napi = { version = "3", features = ["async"] }`. A feature `tokio_time` só é
necessária para o helper `napi::tokio::time::sleep` mostrado mais adiante.

:::

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts
export declare function processBuffer(buffer: Buffer): Promise<Buffer>
```

::: warning
`Buffer` e os wrappers de typed array com ownership implementam `Send` e
`Sync`, permitindo que o lifetime e a limpeza do wrapper atravessem threads.
Esses traits não sincronizam os bytes compartilhados. O JavaScript pode
manter e modificar o mesmo armazenamento enquanto o Rust segura o wrapper.
Acessar essa memória em uma worker Rust enquanto o JavaScript ou outra thread
Rust pode modificá-la constitui uma corrida de dados e pode causar
comportamento indefinido — mesmo que o Rust apenas leia. Copie os bytes antes
de despachar o trabalho ou imponha um protocolo de ownership que exclua todo
acesso não sincronizado.

:::

### Tipos emprestados (Borrowed Types, `BufferSlice`, `Uint8ArraySlice`, etc.)

Esses tipos emprestam os dados e têm seu lifetime vinculado ao escopo da função:

- `BufferSlice<'env>` — slice de Buffer zero-copy
- `Uint8ArraySlice<'env>`, `Int32ArraySlice<'env>`, etc. — slices de TypedArray zero-copy
- `ArrayBuffer<'env>` — visualização de ArrayBuffer zero-copy
- `&[u8]/&[i8]/&[f32]/&[f64]...` — slice zero-copy

**lib.rs**

```rust {4}
use napi_derive::napi;

#[napi]
pub fn sum_array_slice(input: &[u32]) -> u32 {
  // Acesso zero-copy aos dados subjacentes
  input.iter().sum()
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts
export declare function sumArraySlice(input: Uint32Array): number
```

**index.ts**

```ts {5}
import { sumArraySlice } from './index.js'

const input = new Uint32Array([1, 2, 3, 4, 5])

const result = sumArraySlice(input)
console.log(result) // 15
```

### Quando usar cada tipo

**Use `&[u8]/&[i8]/&[f32]/&[f64]...` quando**:

- Você precisa de desempenho zero-copy
- Trabalha apenas em contexto síncrono
- O lifetime dos dados está limitado à chamada da função

**Use `BufferSlice<'env>` ou `Uint8ArraySlice<'env>/Int32ArraySlice<'env>/...` quando**:

- Você precisa de desempenho zero-copy
- Em alguns cenários, você precisa convertê-los em tipos com ownership
- Você precisa convertê-los em `Object` ou `Unknown`

**Use `Buffer` quando**:

- Você precisa armazenar o buffer além da chamada da função
- Trabalha com funções assíncronas

## Padrões de uso comuns

### Convertendo entre tipos

**lib.rs**

```rust {7,10}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn buffer_slice_to_buffer(env: &Env, slice: BufferSlice) -> Result<AsyncBlock<u8>> {
  // Converte BufferSlice em um Buffer com ownership para uso assíncrono
  let buffer = slice.into_buffer(env)?;
  // Copie antes que o trabalho assíncrono possa rodar concorrentemente com o JavaScript.
  let data = buffer.to_vec();
  AsyncBlockBuilder::new(async move {
    Ok(data.iter().sum())
  })
  .build(env)
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts
export declare function bufferSliceToBuffer(slice: Buffer): Promise<number>
```

**index.ts**

```ts {5}
import { bufferSliceToBuffer } from './index.js'

const slice = Buffer.from([1, 2, 3, 4, 5])

const result = await bufferSliceToBuffer(slice)
console.log(result) // 15
```

### Padrões assíncronos vs. síncronos

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

// ✅ Correto: usando um Buffer com ownership em contexto assíncrono
#[napi]
pub async fn process_async(buffer: Buffer) -> Result<Buffer> {
    // O Buffer pode atravessar fronteiras de await
    napi::tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    Ok(buffer)
}

// ❌ Não compila: BufferSlice não pode atravessar fronteiras de await
// #[napi]
// pub async fn process_async_slice(slice: BufferSlice<'_>) -> Result<BufferSlice<'_>> {
//     napi::tokio::time::sleep(std::time::Duration::from_millis(100)).await;
//     Ok(slice) // Error: slice doesn't live long enough
// }

#[napi]
// ✅ Correto: converta o slice para ownership para uso assíncrono
pub fn process_slice_async(env: &Env, slice: BufferSlice<'_>) -> Result<AsyncBlock<Buffer>> {
  let buffer = slice.into_buffer(env)?;
  AsyncBlockBuilder::new(async move { Ok(buffer) }).build(env)
}
```

Todos os exemplos de `AsyncBlock` acima constroem seus futures com o suporte
assíncrono do crate `napi`, que fica atrás da feature `async` na dependência
`napi` (`napi = { version = "3", features = ["async"] }`). É essa feature que
reexporta `AsyncBlock`/`AsyncBlockBuilder` e o runtime Tokio. O helper
`napi::tokio::time::sleep` usado acima requer, adicionalmente, a feature
`tokio_time`.

## Gerenciamento de memória

### Buffers copiados

Em alguns casos, você não pode transferir o ownership dos dados para um `Buffer`
ou typed array. Use `copy_from` para criar uma cópia em vez disso.

::: warning
Se você criar o `Buffer` ou `TypedArray` dessa maneira, o ownership dos dados
não será transferido para o `Buffer` ou `TypedArray`; em vez disso, os dados
subjacentes serão copiados, o que gera o custo de desempenho da cópia dos
dados.

:::

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn create_copied_buffer(env: &Env) -> Result<BufferSlice<'_>> {
  let data = b"Hello, World!";
  BufferSlice::copy_from(env, data)
}
```

### Buffers externos

Às vezes, você pode querer criar um `Buffer` ou `TypedArray` a partir de tipos de dados que fazem `deref` para `[u8]` ou que fornecem o ponteiro bruto, como `*mut u8`. E você não quer copiar todos os dados para um `Vec<u8>`, o que pode ser muito custoso. Fornecemos o método `from_external` para isso, mas ele é unsafe e você precisa garantir que os dados permaneçam válidos até o callback `finalize` ser chamado.

::: info
O parâmetro `finalize_hint` é passado ao finalizer. No primeiro exemplo
abaixo, o boxed slice é ao mesmo tempo o dono da alocação e o hint, então ele
permanece vivo até o callback recebê-lo e descartá-lo. Se o runtime rejeitar
buffers externos, o NAPI-RS primeiro copia os bytes e então invoca esse
callback imediatamente durante o `from_external`; caso contrário, o callback é
executado quando o JavaScript finaliza o buffer externo. Não conte com o
callback sendo adiado até a coleta de lixo.

:::

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn create_shared_buffer(env: &Env) -> Result<BufferSlice<'_>> {
  let mut data = vec![1, 2, 3, 4, 5].into_boxed_slice();
  let data_ptr = data.as_mut_ptr();
  let len = data.len();

  unsafe {
    BufferSlice::from_external(env, data_ptr, len, data, move |_, boxed_data| {
      drop(boxed_data);
    })
  }
}

#[napi]
pub fn create_external_buffer(env: &Env) -> Result<BufferSlice<'_>> {
  let mut data = vec![1, 2, 3, 4, 5];
  let data_ptr = data.as_mut_ptr();
  let len = data.len();
  let capacity = data.capacity();

  // garante que os dados sejam válidos até o callback finalize ser chamado
  std::mem::forget(data);

  unsafe {
    BufferSlice::from_external(env, data_ptr, len, data_ptr, move |_, ptr| {
      // Limpa os dados quando o GC do JavaScript é executado
      std::mem::drop(Vec::from_raw_parts(ptr, len, capacity));
    })
  }
}
```

## Considerações de segurança

### Segurança de buffers externos

Ao usar os métodos `from_external`, garanta:

1. **Validade do ponteiro**: o ponteiro deve permanecer válido até o callback de finalize
2. **Layout de memória**: a memória deve ser compatível com o tipo esperado
3. **Limpeza correta**: o callback de finalize deve desalocar a memória corretamente

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn unsafe_external_example(env: &Env) -> Result<BufferSlice<'_>> {
  let mut data = vec![1u8, 2, 3, 4, 5];
  let ptr = data.as_mut_ptr();
  let len = data.len();
  let capacity = data.capacity();

  // ⚠️ CRÍTICO: é preciso fazer forget do Vec para evitar double-free
  std::mem::forget(data);

  unsafe {
    BufferSlice::from_external(env, ptr, len, ptr, move |_, ptr| {
      // ✅ Reconstrói e descarta o Vec corretamente
      std::mem::drop(Vec::from_raw_parts(ptr, len, capacity));
      // O Vec desaloca automaticamente ao ser descartado
    })
  }
}
```

### Acesso mutável unsafe

Os métodos unsafe `as_mut` expõem um slice mutável para um armazenamento que o
JavaScript também pode acessar. Chamar o método só é seguro (sound) quando você
pode garantir que o JavaScript e todos os outros aliases Rust não vão ler nem
escrever no armazenamento subjacente durante todo o empréstimo mutável. Violar
esse contrato pode causar comportamento indefinido. Em código entre threads,
prefira uma cópia com ownership, a menos que você tenha um protocolo explícito
de sincronização e ownership abrangendo tanto o JavaScript quanto o Rust.
