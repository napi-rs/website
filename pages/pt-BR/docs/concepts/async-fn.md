---
title: 'async fn'
description: Execute uma função assíncrona Rust com o runtime Tokio.
---

# async fn

::: tip
Você deve habilitar o recurso **_async_** ou **_tokio_rt_** no `napi` para usar `async fn`:

**Cargo.toml**

```toml {2}
[dependencies]
napi = { version = "3", features = ["async", "tokio_fs", "tokio_time"] }
napi-derive = "3"
```

Os exemplos abaixo usam as subfeatures `tokio_fs` e `tokio_time`. Habilite somente
as APIs Tokio que o seu addon usa.

:::

## Integração com Tokio

Você pode realizar muitos trabalhos async/multi-threaded com `AsyncTask` e `ThreadsafeFunction`, mas às vezes você pode querer usar diretamente as crates do ecossistema async do Rust.

Com `async` ou `tokio_rt` habilitado, o **NAPI-RS** fornece um runtime Tokio. Se você
aguardar um future Tokio em uma `async fn` exportada, o **NAPI-RS** o executará
nesse runtime e converterá o resultado em uma `Promise` JavaScript.

**lib.rs**

```rust {6}
use napi::bindgen_prelude::*;
use napi_derive::napi;
use napi::tokio::fs;

#[napi]
pub async fn read_file_async(path: String) -> Result<Buffer> {
  let content = fs::read(path).await?;
  Ok(content.into())
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts
export function readFileAsync(path: string): Promise<Buffer>
```

## `&mut self` inseguro

Em alguns casos, você pode precisar usar `&mut self` em uma `async fn`. No entanto, isso é `unsafe` no **NAPI-RS**, porque o `self` também é _de propriedade_ do runtime Node.js. Você não pode garantir que o `self` seja de propriedade apenas do Rust.

**lib.rs**

```rust {9}
use napi_derive::napi;

#[napi]
pub struct Engine {}

#[napi]
impl Engine {
  #[napi]
  pub async fn run(&mut self) {}
}
```

```rust
error: &mut self in async napi methods should be marked as unsafe
 --> src/lib.rs:9:18
  |
9 |     pub async fn run(&mut self) {}
  |                  ^^^
```

Você precisa marcar a `fn` como `unsafe` para usar `&mut self` em uma `async fn`.

**lib.rs**

```rust {9}
use napi_derive::napi;

#[napi]
pub struct Engine {}

#[napi]
impl Engine {
  #[napi]
  pub async unsafe fn run(&mut self) {}
}
```

## Referência automática

Normalmente, os valores JavaScript só são válidos dentro de uma chamada de função. Com `async fn` isso não acontece — os valores JavaScript podem ser coletados pelo garbage collector em qualquer ponto de `await`.

::: info
Veja [Entendendo lifetime](/pt-BR/docs/concepts/understanding-lifetime) para mais
detalhes.

:::

Há 3 tipos de parâmetros que são automaticamente transformados em tipos `Reference`:

- `&self`
- `&mut self`
- `This<T>`

Considere o seguinte exemplo:

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub struct NativeClass {
  name: String,
}

#[napi]
impl NativeClass {
  #[napi(constructor)]
  pub fn new(name: String) -> Self {
    Self { name }
  }

  #[napi]
  pub async fn sleep(&self, delay: u32) -> Result<&str> {
    napi::tokio::time::sleep(std::time::Duration::new(delay as u64, 0)).await;
    Ok(&self.name)
  }
}
```

**index.ts**

```ts
const nativeClass = new NativeClass('Brooklyn')

const name = await nativeClass.sleep(1)

console.log(name) // Brooklyn
```

Há uma chamada implícita de [`napi_create_reference`](https://nodejs.org/api/n-api.html#napi_create_reference) para o valor `Object` JavaScript que contém o `NativeClass` antes da chamada da `async fn`; e uma chamada implícita de [`napi_delete_reference`](https://nodejs.org/api/n-api.html#napi_delete_reference) após a chamada da `async fn`.

Essa estratégia garante que o `NativeClass` permaneça vivo durante a chamada da `async fn`.

## Além do `async fn`: `AsyncBlock`

Uma `async fn` exportada cobre o caso comum, mas ela sempre resolve sua promise com o valor de retorno da função, convertido após a conclusão do future. Quando você precisa de mais controle — resolver com um valor que só pode ser criado na thread JavaScript (por exemplo, um `BufferSlice<'static>` zero-copy ou uma `Response` Web), ou executar uma limpeza por meio de um hook de dispose quando o future é concluído — retorne um `AsyncBlock<T>` de uma função `#[napi]` síncrona. O future inicia imediatamente (eagerly) no runtime do NAPI-RS e se converte em uma `Promise` JavaScript, assim como uma `async fn`.

Veja [Web Streams: `AsyncBlock`](/docs/concepts/streams#asyncblock-a-promise-with-a-dispose-hook) para a API completa do `AsyncBlockBuilder` e exemplos.

## Runtimes personalizados

Por padrão, o future é executado no runtime Tokio gerenciado pelo NAPI-RS. Com a feature Cargo `async-runtime`, você pode registrar seu próprio executor — incluindo runtimes sem tokio para WASI sem threads ou workerd — e toda `async fn` gerada será executada nele. Veja [Runtime async personalizado](/docs/concepts/async-runtime).
