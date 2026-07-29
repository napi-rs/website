---
title: 'Examples'
description: A curated index of the runnable examples in the napi-rs repository.
---

# Examples

The [`napi-rs/napi-rs`](https://github.com/napi-rs/napi-rs) repository keeps a set of runnable example projects under [`examples/`](https://github.com/napi-rs/napi-rs/tree/main/examples). They are the same code the CI test suite exercises, so every snippet compiles and runs against the current release.

## The example projects

| Project                                                                                                       | What it shows                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`examples/napi`](https://github.com/napi-rs/napi-rs/tree/main/examples/napi)                                 | The kitchen sink: one `src/*.rs` file per feature area, built for native, `wasm32-wasip1`, and `wasm32-wasip1-threads`, with browser, workerd, and Electron test targets. Most code snippets on this site are adapted from here.                                                                                                                                       |
| [`examples/napi-compat-mode`](https://github.com/napi-rs/napi-rs/tree/main/examples/napi-compat-mode)         | The v2-era low-level `compat-mode` API (`CallContext`, `JsBuffer`, `JsFunction`, …) organized by Node-API version. Useful when migrating a v2 addon; see the [V2 to V3 migration guide](/docs/more/v2-v3-migration-guide).                                                                                                                                             |
| [`examples/napi-shared`](https://github.com/napi-rs/napi-rs/tree/main/examples/napi-shared)                   | Sharing `#[napi]` classes and object shapes between Rust crates (consumed by `examples/napi`).                                                                                                                                                                                                                                                                         |
| [`examples/napi-cargo-test`](https://github.com/napi-rs/napi-rs/tree/main/examples/napi-cargo-test)           | Testing pure Rust logic with plain `cargo test` — no Node.js — using the `noop` feature on `napi` and `napi-derive`.                                                                                                                                                                                                                                                   |
| [`examples/binary`](https://github.com/napi-rs/napi-rs/tree/main/examples/binary)                             | Building a Rust `bin` target with `napi-raw build` instead of a cdylib addon.                                                                                                                                                                                                                                                                                          |
| [`examples/custom-async-runtime`](https://github.com/napi-rs/napi-rs/tree/main/examples/custom-async-runtime) | A complete hand-rolled [`AsyncRuntime`](/docs/concepts/async-runtime) backend — scheduler, blocking pool, lifecycle hooks — with threadless `wasm32-wasip1`, [workerd](https://github.com/napi-rs/napi-rs/tree/main/examples/custom-async-runtime/workerd), and [browser](https://github.com/napi-rs/napi-rs/tree/main/examples/custom-async-runtime/browser) targets. |
| [`examples/shared-async-runtime`](https://github.com/napi-rs/napi-rs/tree/main/examples/shared-async-runtime) | The end-to-end consumer of the published [`napi-async-runtime`](https://crates.io/crates/napi-async-runtime) crate: install it from `#[module_init]`, then use `async fn`, `sleep_until`, and `spawn_blocking` without Tokio.                                                                                                                                          |

## Inside `examples/napi`

The main example crate is organized one file per topic. Quick index:

### Values & types

- [`number.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/number.rs), [`string.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/string.rs), [`bigint.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/bigint.rs), [`date.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/date.rs) — primitive conversions, including Latin-1/UTF-16 strings and BigInt.
- [`either.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/either.rs) — `Either` through `Either4` union arguments and returns.
- [`nullable.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/nullable.rs) — `Option`, `Null`, and `Undefined` handling.
- [`map.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/map.rs), [`set.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/set.rs) — object/Map and Set conversions.
- [`typed_array.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/typed_array.rs) — buffers, typed arrays, and zero-copy slices (see [TypedArray](/docs/concepts/typed-array)).
- [`serde.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/serde.rs) — `serde-json` conversions to and from Rust structs.
- [`enum.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/enum.rs), [`type.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/type.rs) — enums and exported type aliases.

### Classes

- [`class.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/class.rs), [`constructor.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/constructor.rs), [`class_factory.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/class_factory.rs) — constructors, factories, getters/setters, and class methods (see [Class](/docs/concepts/class)).
- [`external.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/external.rs), [`reference.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/reference.rs) — `External<T>` and `Reference<T>` / `WeakReference<T>`.
- [`type_tag.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/type_tag.rs) — the unforgeable per-class type tags (see [`type_tag`](/docs/concepts/napi-attributes#type_tag)).
- [`object.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/object.rs) — creating and inspecting JavaScript objects.

### Async & threads

- [`async.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/async.rs), [`promise.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/promise.rs) — exported `async fn`s and awaiting JavaScript promises (see [async fn](/docs/concepts/async-fn), [Promise](/docs/concepts/promise)).
- [`task.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/task.rs) — `Task` / `AsyncTask` on the libuv pool, with `AbortSignal` (see [AsyncTask](/docs/concepts/async-task)).
- [`threadsafe_function.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/threadsafe_function.rs) — every `ThreadsafeFunction` flavor (see [ThreadsafeFunction](/docs/concepts/threadsafe-function)).
- [`generator.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/generator.rs) — sync and async iterator classes (see [Iterators](/docs/concepts/iterators)).

### Streams & fetch

- [`stream.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/stream.rs) — accepting and returning Web `ReadableStream`s, including streams of `#[napi(object)]` structs (see [Web Streams](/docs/concepts/streams)).
- [`fetch.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/fetch.rs) — a `fetch` built on `reqwest`, resolving a promise with a Web `Response` via `AsyncBlockBuilder::build_with_map`.

### WASI, Env & scopes

- [`wasm.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/wasm.rs) — threadsafe functions and worker patterns that also run on WASI targets (see [WebAssembly](/docs/concepts/webassembly)).
- [`env.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/env.rs) — low-level `Env` APIs: `run_script`, module file names, versions.
- [`scope.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/scope.rs) — `HandleScope` / `EscapableHandleScope` for loops that create many short-lived values (see [Env](/docs/concepts/env#handlescope-and-escapablehandlescope)).
- [`lifetime.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/lifetime.rs) — borrowed vs. owned values across calls (see [Understanding Lifetime](/docs/concepts/understanding-lifetime)).

### Modules, functions & errors

- [`js_mod.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/js_mod.rs) — nested JavaScript namespaces via `#[napi] mod` (see [Exports](/docs/concepts/exports#namespaces)).
- [`function.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/function.rs), [`callback.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/callback.rs) — the `Function` type and callbacks.
- [`fn_strict.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/fn_strict.rs), [`fn_return_if_invalid.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/fn_return_if_invalid.rs), [`fn_ts_override.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/fn_ts_override.rs) — argument validation and TypeScript overrides (see [`#[napi]` attributes](/docs/concepts/napi-attributes)).
- [`error.rs`](https://github.com/napi-rs/napi-rs/blob/main/examples/napi/src/error.rs) — throwing and returning errors (see [Errors and panics](/docs/concepts/error-handling)).

## Run them locally

The examples live in the napi-rs workspace and build with the in-repo CLI:

```sh
git clone https://github.com/napi-rs/napi-rs.git
cd napi-rs
yarn
yarn build      # build the @napi-rs/* packages (CLI, wasm-runtime, ...)
yarn build:test # build the @examples/* packages with the in-repo CLI

cd examples/napi
yarn test       # ava
```

The WASI and browser variants have their own scripts — see each example's `package.json` (for example `test:wasi` in `examples/shared-async-runtime`, or `test-workerd.mjs` / `browser/runtime.spec.js` in `examples/custom-async-runtime`).
