---
title: 'Cargo features'
description: Configure Node-API level, async support, conversions, diagnostics, and compatibility features.
---

# Cargo features

The `napi` feature set controls which Node-API symbols and high-level Rust APIs are compiled into an addon. Choose the lowest Node-API level that provides the APIs you use, then enable only the optional integrations your crate needs.

**Cargo.toml**

```toml
[dependencies]
napi = { version = "3", features = ["napi6", "async", "serde-json"] }
napi-derive = "3"
```

## Defaults

`napi` enables these features by default:

```toml
default = ["napi4", "dyn-symbols"]
```

This means adding `features = ["napi2"]` without disabling defaults still builds for Node-API 4. To target a level below 4, disable defaults explicitly and decide whether to retain dynamic symbol loading:

**Cargo.toml**

```toml
[dependencies]
napi = {
  version = "3",
  default-features = false,
  features = ["napi3", "dyn-symbols"]
}
```

::: warning
A Cargo feature is a compile-time capability, not a runtime polyfill. Calling
a Node-API function that the host does not provide is unsupported even when
`dyn-symbols` lets the native library itself load.

:::

## Node-API levels

The `napi1` through `napi10` features are cumulative. For example, `napi8` enables `napi7`, which enables every lower level. The selected level is the minimum Node-API capability your addon may rely on.

| Feature  | Representative napi-rs APIs gated at this level                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `napi1`  | Base values, functions, objects, arrays, buffers, async work, Promises, and references.                                              |
| `napi2`  | Access to the libuv event loop with `Env::get_uv_event_loop` on native targets.                                                      |
| `napi3`  | Environment cleanup hooks.                                                                                                           |
| `napi4`  | ThreadsafeFunction, deferred/async runtime integration, and napi-rs's cross-thread reference cleanup machinery. This is the default. |
| `napi5`  | JavaScript `Date`, finalizers, and related object/property APIs.                                                                     |
| `napi6`  | BigInt and BigInt typed arrays, per-environment instance data, and additional object/ArrayBuffer APIs.                               |
| `napi7`  | Detaching and testing detached ArrayBuffers.                                                                                         |
| `napi8`  | Async cleanup hooks, object freeze/seal, and type-tagging APIs.                                                                      |
| `napi9`  | Global symbols, module file names, and JavaScript `SyntaxError` creation/throwing.                                                   |
| `napi10` | External Latin-1/UTF-16 strings and dedicated property-key creation APIs.                                                            |

The table lists representative high-level gates, not every raw function re-exported by `napi-sys`.

Node.js has backported some Node-API levels to multiple release lines, so a single Node major version is not a precise compatibility test. Check the official [Node-API version matrix](https://nodejs.org/api/n-api.html#node-api-version-matrix) and the actual runtime value:

```js
console.log(process.versions.napi)
```

Inside native code, `Env::get_napi_version()` reads the same value. Your package's supported-runtime claim should be no broader than both the selected Node-API level and the runtime versions you actually test.

### Choosing a level

1. Start with the template/default `napi4` unless a dependency or required API dictates otherwise.
2. Raise it when the compiler shows that a needed API is feature-gated.
3. Test the oldest runtime in the resulting compatibility range.
4. Keep the CLI's `minNodeApiVersion`, Cargo features, package `engines`, and CI matrix consistent.

Raising the feature can make the resulting addon unloadable or unusable on older runtimes. Lowering it removes Rust APIs at compile time and is the safest way to discover accidental dependencies on a newer level.

## Async and Tokio

| Feature           | Enables                                                                          | Important tradeoff                                                                                     |
| ----------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `tokio_rt`        | napi-rs's Tokio runtime integration and `napi4`; re-exports `tokio` from `napi`. | Adds Tokio runtime code and lifecycle management. Required by exported Rust `async fn`.                |
| `async`           | Alias for `tokio_rt`.                                                            | Use either name; enabling both is redundant.                                                           |
| `tokio_full`      | Tokio's `full` feature set.                                                      | Large dependency and binary-size increase; it does **not** replace `tokio_rt` for napi-rs integration. |
| `tokio_fs`        | Tokio filesystem APIs.                                                           | Also enable `tokio_rt`/`async` for exported async functions.                                           |
| `tokio_io_std`    | Tokio async stdin/stdout/stderr.                                                 | Same runtime requirement.                                                                              |
| `tokio_io_util`   | Tokio I/O utility traits and adapters.                                           | Same runtime requirement.                                                                              |
| `tokio_macros`    | Tokio procedural macros.                                                         | Not needed merely to export an `async fn` with `#[napi]`.                                              |
| `tokio_net`       | Tokio networking.                                                                | Same runtime requirement.                                                                              |
| `tokio_process`   | Tokio child-process support.                                                     | Platform-specific behavior still applies.                                                              |
| `tokio_signal`    | Tokio signal handling.                                                           | Process-wide signal interactions still apply.                                                          |
| `tokio_sync`      | Tokio synchronization types.                                                     | Same runtime requirement.                                                                              |
| `tokio_test_util` | Tokio time/testing utilities.                                                    | Primarily for tests.                                                                                   |
| `tokio_time`      | Tokio timers and timeouts.                                                       | Same runtime requirement.                                                                              |

The component features enable features on the Tokio dependency. They do not all imply napi-rs's `tokio_rt`; list it explicitly unless another selected feature, such as `web_stream`, already enables it.

**Cargo.toml**

```toml
[dependencies]
napi = { version = "3", features = ["async", "tokio_fs", "tokio_time"] }
```

For CPU-bound work, prefer [AsyncTask](/docs/concepts/async-task), which uses libuv's worker pool, instead of blocking the Tokio runtime.

## Conversion features

| Feature              | Adds                                                                                                     | Notes                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `serde-json`         | `serde_json::Value`, `Map`, and `Number` conversion; enables `serde` and `serde_json`.                   | JavaScript values outside JSON's data model are rejected or require an explicit representation.            |
| `serde-json-ordered` | `serde-json` plus `serde_json/preserve_order`.                                                           | Preserves map insertion order in serde_json's representation; JavaScript property-order rules still apply. |
| `chrono_date`        | `chrono::DateTime` and `NaiveDateTime` conversion; enables `chrono` and `napi5`.                         | JavaScript Date precision is milliseconds.                                                                 |
| `latin1`             | Latin-1 to UTF-8 decoding/display through `encoding_rs`.                                                 | `Latin1String` conversion itself exists without this feature; formatting/decoding support is gated.        |
| `object_indexmap`    | `IndexMap` and `IndexSet` conversions.                                                                   | Adds the `indexmap` dependency. Maps still use plain JavaScript objects; sets use JavaScript `Set`.        |
| `web_stream`         | `ReadableStream` and `WriteableStream`; enables `futures-core`, `tokio-stream`, `tokio_rt`, and `napi4`. | The runtime must also provide compatible Web Streams globals.                                              |
| `error_anyhow`       | Conversion from `anyhow::Error` and the optional `anyhow` dependency.                                    | Conversion uses `GenericFailure`; map errors manually for stable domain codes.                             |

See [Type conversions](/docs/concepts/type-conversions) for directionality and data-copy behavior.

## Linking and runtime detection

### `dyn-symbols`

On supported native targets, `dyn-symbols` resolves Node-API functions from the host process when the addon initializes instead of requiring every symbol to be resolved by the platform linker. It is enabled by default.

This is especially useful across operating systems and Node-compatible hosts with different native linking behavior. Missing functions use generated stubs so symbol loading can continue, but calling a missing API still fails. `dyn-symbols` does not turn Node-API 10 into Node-API 4.

Disable it only when the target's static/direct symbol-linking model is deliberate and tested:

**Cargo.toml**

```toml
napi = { version = "3", default-features = false, features = ["napi6"] }
```

### `node_version_detect`

`node_version_detect` reads and caches the host Node version during module registration. napi-rs uses it to select a few guarded optimized paths, including newer property-creation paths when the required symbols and companion features are enabled.

It is not a general compatibility guard around every Node-API call. Your code must still respect the selected Node-API feature and runtime support matrix.

## Diagnostics and observability

| Feature          | Behavior                                                                                                                             | Cost / limitation                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `deferred_trace` | Captures a JavaScript error when creating a deferred so later cross-thread rejection retains the caller-side stack. Implies `napi4`. | Allocates and retains an error/reference for affected deferred operations.  |
| `tracing`        | Re-exports `tracing` from `napi`.                                                                                                    | To emit generated callback-entry events, also enable `napi-derive/tracing`. |

**Cargo.toml**

```toml
[dependencies]
napi = { version = "3", features = ["napi4", "tracing"] }
napi-derive = { version = "3", features = ["tracing"] }
```

Generated callback events use the `napi` tracing target. Install and configure a tracing subscriber in the embedding application or addon initialization path if you want to observe them.

## Compatibility and development-only features

| Feature        | Purpose                                                                                               | Use in production?                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `compat-mode`  | Restores deprecated v2-era low-level types, traits, and macros for migration.                         | Only while migrating; prefer v3 bindgen APIs for new code.                                                         |
| `experimental` | Enables experimental raw Node-API symbols and optimized paths guarded by napi-rs.                     | Only when you control and test the runtime; experimental Node APIs do not carry the stable Node-API ABI guarantee. |
| `noop`         | Replaces registration/conversion paths so Rust crates can be compiled or tested without loading Node. | No. Pair with `napi-derive/noop`; JavaScript conversion behavior is not exercised.                                 |

The iterator attributes are labeled experimental in the Rust API but are **not** controlled by the `experimental` Cargo feature. Synchronous iterators are in the base bindgen runtime; async iterators require `tokio_rt`.

### Cargo-only tests with `noop`

**Cargo.toml**

```toml
[features]
noop = ["napi/noop", "napi-derive/noop"]

[dependencies]
napi = "3"
napi-derive = "3"
```

Use this to test pure Rust logic that happens to live in an addon crate. Run JavaScript integration tests against a real built addon for conversions, exceptions, references, finalizers, workers, and environment cleanup.

## The `full` bundle

`full` is a convenience bundle containing exactly:

```toml
full = [
  "latin1",
  "napi10",
  "async",
  "serde-json",
  "experimental",
  "chrono_date",
]
```

It does **not** mean every feature: for example, it does not include `web_stream`, `object_indexmap`, `deferred_trace`, `node_version_detect`, `tracing`, `error_anyhow`, or every Tokio component.

Because it raises the Node-API level to 10 and enables experimental APIs, `full` is convenient for documentation builds and broad internal testing but is rarely the right default for a published addon.

## `napi-derive` features

The procedural macro crate has its own feature set:

| Feature       | Default | Effect                                                                                                                                                |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type-def`    | Yes     | Emits metadata consumed by `@napi-rs/cli` to generate `.d.ts` declarations.                                                                           |
| `strict`      | Yes     | Reports parsed `#[napi]` options that were not used for the selected item. This is compile-time macro validation, not JavaScript argument validation. |
| `tracing`     | No      | Adds tracing events to generated callback wrappers. Pair with `napi/tracing`.                                                                         |
| `compat-mode` | No      | Enables legacy derive macros used by the compatibility API.                                                                                           |
| `noop`        | No      | Disables normal macro expansion for Cargo-only builds/tests.                                                                                          |
| `full`        | No      | Enables `type-def`, `strict`, and `compat-mode`.                                                                                                      |

Do not confuse `napi-derive/strict` with the per-function `#[napi(strict)]` attribute: the feature checks macro usage at compile time; the attribute validates JavaScript values at runtime.

## Recommended published-addon baseline

**Cargo.toml**

```toml
[dependencies]
napi = {
  version = "3",
  default-features = false,
  features = ["napi4", "dyn-symbols"]
}
napi-derive = "3"

[build-dependencies]
napi-build = "2"
```

Add integration features only as the public API requires them, document the resulting minimum Node-API level, and test that minimum runtime plus the current supported runtimes in CI.
