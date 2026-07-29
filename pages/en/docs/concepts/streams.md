---
title: 'Web Streams'
description: Accept and return JavaScript Web Streams (ReadableStream / WritableStream) from Rust.
---

# Web Streams

NAPI-RS can accept a JavaScript [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) or [`WritableStream`](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream) as a function argument, and can create a `ReadableStream` from any Rust [`Stream`](https://docs.rs/futures-core/latest/futures_core/stream/trait.Stream.html) and hand it back to JavaScript.

Support lives behind the **`web_stream`** Cargo feature, which also enables `tokio_rt` (see [Cargo features](/docs/concepts/cargo-features)):

**Cargo.toml**

```toml
[dependencies]
napi = { version = "3", features = ["async", "web_stream"] }
napi-derive = "3"
```

The host runtime must provide compatible Web Streams globals — Node.js 18+ exposes `ReadableStream` globally (also via `node:stream/web`). When the global `ReadableStream` constructor is missing, stream creation fails with a "ReadableStream is not supported in this Node.js version" error.

## Accepting a `ReadableStream`

A `ReadableStream<T>` argument is validated with `instanceof` against the global `ReadableStream` constructor. Calling `.read()` locks the stream with `getReader()` and returns a `Reader<T>` — a Rust `Stream` of `Result<T>` items you can consume with `tokio_stream::StreamExt` (re-exported as `napi::tokio_stream`) inside any async block:

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;
use napi::tokio_stream::StreamExt;

/// Counts the chunks read from a stream, swallowing (dropping) any read error.
#[napi]
pub fn drain_stream_count(
  env: &Env,
  stream: ReadableStream<Uint8Array>,
) -> Result<AsyncBlock<u32>> {
  let mut reader = stream.read()?;
  AsyncBlockBuilder::new(async move {
    let mut count = 0u32;
    while let Some(item) = reader.next().await {
      match item {
        Ok(_) => count += 1,
        // Drop the error on the Tokio thread instead of returning it to JS.
        Err(_err) => break,
      }
    }
    Ok(count)
  })
  .build(env)
}
```

**index.d.ts**

```ts
export declare function drainStreamCount(
  stream: ReadableStream<Uint8Array>,
): Promise<number>
```

**index.mjs**

```js
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import { drainStreamCount } from './index.js'

// Any Node.js stream can be converted with Readable.toWeb
const count = await drainStreamCount(
  Readable.toWeb(createReadStream('./file.txt')),
)
```

## Returning a `ReadableStream`

To hand a stream **to** JavaScript, build one from a Rust `Stream<Item = Result<T>>` that is `Unpin + Send + 'static`:

- `ReadableStream::new(env, stream)` — for any item type that implements `ToNapiValue + Send + 'static` (numbers, strings, `#[napi(object)]` structs, …).
- `ReadableStream::create_with_stream_bytes(env, stream)` — for byte streams; the items only need `Into<Vec<u8>>`, and the underlying source is created with `type: 'bytes'`.
- `ReadableStream::with_stream_bytes_and_readable_stream_class(env, class, stream)` — the same byte stream, but constructed from a caller-supplied `ReadableStream` class, for runtimes whose stream implementation is not the global constructor.

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;
use napi::tokio_stream::wrappers::ReceiverStream;

#[napi]
pub fn create_readable_stream(env: &Env) -> Result<ReadableStream<'_, BufferSlice<'_>>> {
  let (tx, rx) = napi::tokio::sync::mpsc::channel(100);
  std::thread::spawn(move || {
    for _ in 0..100 {
      tx.try_send(Ok(b"hello".to_vec())).expect("stream queue is full or closed");
    }
  });
  ReadableStream::create_with_stream_bytes(env, ReceiverStream::new(rx))
}

#[napi(object)]
#[derive(Default)]
pub struct StreamItem {
  pub name: String,
  pub size: i32,
}

/// Creates a ReadableStream that emits StreamItem objects.
#[napi]
pub fn create_readable_stream_with_object(
  env: &Env,
) -> Result<ReadableStream<'_, StreamItem>> {
  let (tx, rx) = napi::tokio::sync::mpsc::channel(100);
  std::thread::spawn(move || {
    for i in 0..100 {
      let item = StreamItem {
        name: format!("item-{i}"),
        size: i,
      };
      tx.try_send(Ok(item)).expect("stream queue is full or closed");
    }
  });
  ReadableStream::new(env, ReceiverStream::new(rx))
}
```

**index.d.ts**

```ts
export declare function createReadableStream(): ReadableStream<Buffer>

export declare function createReadableStreamWithObject(): ReadableStream<StreamItem>
```

On the JavaScript side a returned stream is a real Web `ReadableStream` — consume it with a reader or `for await`:

**index.mjs**

```js
import { createReadableStreamWithObject } from './index.js'

for await (const item of createReadableStreamWithObject()) {
  console.log(item.name, item.size)
}
```

`ReadableStream` also exposes the `locked()` and `cancel(reason)` Web API methods from Rust.

## `AsyncBlock`: a promise with a dispose hook

The examples above return `AsyncBlock<T>`, the primitive behind "return a promise" when you are not using an `async fn`. An `AsyncBlock<T>` starts its future on the NAPI-RS runtime **eagerly** — when the Rust function is called, not when JavaScript awaits it — and the returned value converts into a JavaScript `Promise<T>` (see [Promise](/docs/concepts/promise) and [async fn](/docs/concepts/async-fn)).

Build one with `AsyncBlockBuilder`:

- `AsyncBlockBuilder::new(future)` — the future is `Future<Output = Result<V>> + Send + 'static`.
- `.with_dispose(|env| ...)` — a hook that runs on the JavaScript thread when the future resolves **successfully**, before the value is converted. Note it only covers the `Ok` path: when the future returns `Err`, the promise rejects without running the hook. If a resource must be released on failure too, release it inside the future itself (or map the `Err` before building the block) and keep `with_dispose` for the success path.
- `.build(env)` — spawns the future and produces the `AsyncBlock<V>`.
- `AsyncBlockBuilder::build_with_map(env, future, map)` — a static constructor whose `map` closure runs on the JavaScript thread at resolution time, turning the future's output into the final JavaScript value. This is the escape hatch for values that can only be created on the JS thread.

`build_with_map` is how you resolve a promise with a zero-copy buffer: the future produces owned bytes on the runtime thread, and the map closure wraps them in a `BufferSlice<'static>` — without copying — on the JavaScript thread:

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;
use napi::tokio_stream::StreamExt;

#[napi]
pub fn accept_stream(
  env: &Env,
  stream: ReadableStream<Uint8Array>,
) -> Result<AsyncBlock<BufferSlice<'static>>> {
  let mut reader = stream.read()?;
  AsyncBlockBuilder::build_with_map(
    env,
    async move {
      let mut bytes = Vec::new();
      while let Some(chunk) = reader.next().await {
        bytes.extend_from_slice(&chunk?);
      }
      Ok(bytes)
    },
    |env, mut value| {
      let value_ptr = value.as_mut_ptr();
      unsafe {
        BufferSlice::from_external(&env, value_ptr, value.len(), value, move |_, bytes| {
          drop(bytes);
        })
      }
    },
  )
}
```

(The [full example](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/stream.rs) adapts the chunk stream into an `AsyncRead` with `tokio_util::io::StreamReader` instead of collecting chunk by chunk; both shapes end in the same `from_external` map closure.)

**index.d.ts**

```ts
export declare function acceptStream(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer>
```

Because the map closure runs on the JavaScript thread with a live `Env`, it can also call back into JavaScript constructors. The full [`fetch` example](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/fetch.rs) uses this to build a Web `Response` around a NAPI-RS byte stream, and overrides the generated declaration with [`ts_return_type`](/docs/concepts/napi-attributes) so the return type references the `undici-types` package:

**lib.rs**

```rust
#[napi(ts_return_type = "Promise<import('undici-types').Response>")]
pub fn fetch(
  env: &Env,
  url: String,
  request_init: Option<RequestInit>,
) -> Result<AsyncBlock<Unknown<'static>>> {
  AsyncBlockBuilder::build_with_map(
    env,
    async move { /* ... reqwest request ... */ },
    |env, response| {
      let global = env.get_global()?;
      let response_constructor: Function<ReadableStream<BufferSlice>, ()> =
        global.get_named_property("Response")?;
      let js_stream = ReadableStream::create_with_stream_bytes(&env, /* response body stream */)?;
      response_constructor.new_instance(js_stream)
    },
  )
}
```

**index.d.ts**

```ts
export declare function fetch(
  url: string,
  requestInit?: RequestInit | undefined | null,
): Promise<import('undici-types').Response>
```

## Accepting a `WritableStream`

A `WriteableStream` argument (note the NAPI-RS spelling) wraps a JavaScript `WritableStream`. It is a thin handle over the Web API: `ready()`, `abort(reason)`, and `close()` each call the corresponding JavaScript method and return a `PromiseRaw<()>` you can convert into an awaitable [`Promise`](/docs/concepts/promise) inside an async context. The writable side of a stream cannot be created from Rust today — accept it from JavaScript, or pipe a returned `ReadableStream` into it on the JavaScript side.

::: tip
The runnable versions of every snippet on this page live in [`examples/napi/src/stream.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/stream.rs) and [`examples/napi/src/fetch.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/fetch.rs), with their tests in [`examples/napi/__tests__/values.spec.ts`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/__tests__/values.spec.ts).
:::
