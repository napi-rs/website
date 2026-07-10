---
title: 'Troubleshooting'
description: Diagnose NAPI-RS build, loader, platform, TypeScript, async, and WASI failures from the failing layer outward.
---

# Troubleshooting

First identify the failing layer. A Rust compiler error, a generated-loader
error, and a crash after a successful import have different owners and require
different evidence.

| Failure point                                        | Start with                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `cargo` or `napi build` exits non-zero               | [Build failures](#build-failures)                             |
| `require()` / `import` cannot load the package       | [Loader failures](#loader-failures)                           |
| Loader finds a binary but the OS rejects it          | [Binary and platform failures](#binary-and-platform-failures) |
| Runtime values work but `.d.ts` is wrong             | [TypeScript generation](#typescript-generation)               |
| Promise hangs, process will not exit, worker crashes | [Async and lifecycle failures](#async-and-lifecycle-failures) |
| WASI/browser initialization fails                    | [WASI failures](#wasi-failures)                               |

Reduce the issue to one exported function and one plain Node script before
adding a test runner, bundler, framework, or Electron. If the plain script
works, the integration layer is part of the reproduction.

## Capture the environment

Run these commands in the same shell, container, or CI job that fails:

```sh
node -p "process.version"
node -p "process.execPath"
node -p "process.platform + ' ' + process.arch"
node -p "JSON.stringify(process.versions, null, 2)"
rustc -vV
cargo -V
napi --version
```

On Linux, also record the runtime libc:

```sh
node -p "process.report?.getReport?.().header.glibcVersionRuntime || 'musl or unknown'"
ldd --version 2>&1 | head -1
```

Enable both CLI and Rust diagnostics:

```sh
DEBUG='napi:*' RUST_BACKTRACE=full napi build --platform --verbose
DEBUG='napi:*' RUST_BACKTRACE=full node ./repro.cjs
```

Keep the first error and its complete cause/backtrace. A later “build failed”
line is usually only a summary.

## Build failures

### `No crate found in manifest`

`--cwd` is the base for every relative path. Verify what the CLI will read:

```sh
pwd
ls -l Cargo.toml package.json
cargo metadata --manifest-path Cargo.toml --format-version 1 --no-deps
```

In a split workspace, pass all paths explicitly. If the manifest is a virtual
workspace, also pass the exact Cargo package name:

```sh
napi build \
  --cwd packages/addon \
  --manifest-path ../../Cargo.toml \
  --package my-addon-native \
  --package-json-path package.json \
  --output-dir . \
  --platform
```

See [Manual setup](/docs/introduction/manual-setup) for the meaning of each
option.

### Cargo succeeds but NAPI-RS cannot copy the artifact

Confirm that the selected package contains a `cdylib` target:

**Cargo.toml**

```toml
[lib]
crate-type = ["cdylib"]
```

Check whether `CARGO_BUILD_TARGET_DIR`, `--target-dir`, a custom Cargo profile,
or `CARGO_BUILD_TARGET` redirected Cargo output. Use the same `--target` and
`--profile` values for the build and copy step. `DEBUG=napi:*` prints the exact
source and destination paths used by the CLI.

### A C/C++ dependency cannot find a compiler or library

Rust target installation is only one part of a native cross-build. Build
scripts for `openssl-sys`, `ring`, `zstd-sys`, and similar crates also need a C
compiler and libraries for the target. Do not point them at host libraries.

Use the [cross-build decision matrix](/docs/cross-build), then inspect the first
failing compiler invocation. Record `CC`, target-specific `CC_*`, linker, SDK,
sysroot, and `pkg-config` variables. For WASI C/C++ dependencies, configure
`WASI_SDK_PATH` as described in [WebAssembly](/docs/concepts/webassembly).

## Loader failures

The generated loader records native-candidate load failures in an error `cause`
chain. Print it instead of reporting only “Cannot find native binding”:

**load-repro.cjs**

```js
try {
  require('./index.js')
} catch (error) {
  let current = error
  let depth = 0
  while (current) {
    console.error(`[cause ${depth}]`, current.stack || current)
    current = current.cause
    depth += 1
  }
  process.exitCode = 1
}
```

The individual native causes distinguish a missing file from a wrong
architecture, missing shared library, or unsupported Node-API symbol. An
ordinary failed WASI fallback is not appended to this chain. To diagnose that
path explicitly, rerun with `NAPI_RS_FORCE_WASI=error`; the thrown error then
chains the WASI binding failures.

### The optional platform package is missing

Record the detected platform and installed dependency tree:

```sh
node -p "process.platform + ' ' + process.arch"
npm ls your-package
find node_modules -type f \( -name '*.node' -o -name '*.wasm' \)
```

Common causes are:

- installation used `--no-optional` or omitted optional dependencies;
- a lockfile generated on another platform did not include the current target;
- a deployment copied only production JavaScript and discarded `.node` files;
- pnpm/Yarn supported-architecture settings exclude the deployment CPU/libc;
- the root and optional platform packages are different versions.

Set `NAPI_RS_ENFORCE_VERSION_CHECK=1` to turn the last case into an explicit
version-mismatch error. If npm omitted an optional platform dependency because
of its lockfile behavior, remove both `node_modules` and the affected lockfile,
then install again on the target platform. Inspect or save the old lockfile
first when it is needed for a bug report.

### Force one exact native library

To separate loader selection from binary loading, point the generated loader at
one absolute path:

```sh
NAPI_RS_NATIVE_LIBRARY_PATH="$PWD/addon.linux-x64-gnu.node" node load-repro.cjs
```

If that succeeds, the binary is valid and normal platform/package selection is
the failing layer. If it fails, the new cause is the operating system's direct
loader error. Do not ship this environment variable as the normal package
configuration.

### CommonJS/ESM parse or export errors

- A CommonJS wrapper inside a `"type": "module"` package must use `.cjs`.
- Generate a real ESM wrapper with `napi build --platform --esm` when consumers
  need static named ESM exports.
- Importing a CommonJS wrapper through a transpiling test runner is not the same
  as testing with plain Node.
- Keep native packages external to server bundles.

See [Integrations and bundlers](/docs/more/integrations) for tested package
shapes and externalization recipes.

## Binary and platform failures

Inspect the actual file selected by the loader:

```sh
file ./addon.*.node
```

Then inspect dynamic dependencies:

```sh
# Linux
ldd ./addon.linux-x64-gnu.node

# macOS
otool -L ./addon.darwin-arm64.node

# Windows Developer Command Prompt
dumpbin /DEPENDENTS addon.win32-x64-msvc.node
```

Typical messages mean:

| Message                                                                 | Likely cause                                                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `wrong ELF class`, `Exec format error`, `not a valid Win32 application` | CPU or operating-system mismatch                                                                 |
| `GLIBC_x.y not found`                                                   | Binary was built against newer glibc than the runtime                                            |
| `lib*.so` / `.dylib` / `.dll` not found                                 | A non-system native dependency was not shipped or its search path is wrong                       |
| `undefined symbol: napi_*`                                              | Addon enabled a newer Node-API level than the runtime provides, or was linked/loaded incorrectly |
| `invalid ELF header` while loading on Alpine                            | glibc binary selected for a musl runtime, or the reverse                                         |

Do not rename a musl binary to a `gnu` suffix or an x64 binary to an arm64
suffix. The suffix is a selection contract, not a conversion.

For `GLIBC_x.y not found`, rebuild against an older glibc as documented in
[Cross build: glibc versions](/docs/cross-build#glibc-versions). Switching to a
musl target is only correct when the deployment actually uses musl.

## TypeScript generation

If no `.d.ts` file is emitted, verify that the selected Cargo package directly
depends on `napi-derive` with its `type-def` feature. Default features include
it; disabling default features requires adding it back explicitly:

**Cargo.toml**

```toml
napi-derive = { version = "3", default-features = false, features = ["strict", "type-def"] }
```

If a declaration is missing or stale:

1. Confirm the export is compiled for the current target and is not hidden by
   `#[cfg(...)]` or `#[napi(skip_typescript)]`.
2. Confirm the CLI selected the intended Cargo package and `package.json`.
3. Rebuild without watch mode and inspect `DEBUG=napi:*` output.
4. Remove only the generated type-definition cache under `target/napi-rs`, then
   rebuild.
5. Run `tsc --noEmit` against the newly generated file.

Do not hand-edit generated declarations; the next build overwrites them. Use
`ts_args_type`, `ts_return_type`, `dtsHeader`, or a hand-written public wrapper
when the Rust-to-TypeScript mapping intentionally differs.

## Async and lifecycle failures

### A Promise never settles

Determine which abstraction owns it:

- Tokio `async fn`: check for blocking work on the async runtime and detached
  tasks that never complete.
- `AsyncTask`: check whether `compute`, `resolve`, `reject`, or `finally` is
  blocked. `AbortSignal` only cancels work that has not started unless the task
  implements cooperative cancellation.
- ThreadsafeFunction: handle `QueueFull` and `Closing`; do not block while the
  JavaScript thread is waiting on the producer.
- Stream/iterator: make cancellation wake the producer and close every sender.

Add timestamps and operation IDs on both sides of the boundary. A Rust log that
says “queued” and a JavaScript log that says “awaiting” do not prove the
completion callback ran.

### Node does not exit

Move the reproduction to a child process with a deadline. Then look for:

- a strong ThreadsafeFunction that should have been weak;
- undropped ThreadsafeFunction clones or JavaScript references;
- Tokio tasks without an owner/shutdown path;
- workers, timers, streams, or sockets left open by either JavaScript or Rust.

Test the real exit path rather than calling `process.exit()`, which hides active
handles and skipped cleanup.

### Worker termination crashes or hangs

Load the addon independently in every worker isolate. Do not share `Env`, class
constructors, or JavaScript handles globally between isolates. Implement a
graceful stop/cancel/await protocol before `worker.terminate()`.

Abrupt termination during active native async work remains a runtime-sensitive
limitation, with an open Bun report in
[napi-rs#2938](https://github.com/napi-rs/napi-rs/issues/2938). Reproduce in
plain Node and the target Bun/Electron runtime separately.

See [Async and concurrency](/docs/more/async-concurrency) and
[Testing and debugging](/docs/more/testing-debugging) for lifecycle tests.

### Native panic or process abort

Run a debug build with `RUST_BACKTRACE=full` and attach a native debugger. A
panic cannot always be recovered safely across an FFI boundary. Convert
expected failures to `napi::Result`; reserve panics for violated internal
invariants, and document whether `#[napi(catch_unwind)]` is used.

Follow [Testing and debugging](/docs/more/testing-debugging) for CodeLLDB, LLDB,
GDB, worker stress, and leak tests.

## WASI failures

### `SharedArrayBuffer is not defined` or memory creation fails

The browser page is not cross-origin isolated. Serve the main document and
subresources with:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Confirm in the browser console:

```js
console.log(globalThis.crossOriginIsolated, typeof SharedArrayBuffer)
```

Also ensure cross-origin scripts, workers, WASM, and images satisfy the selected
COEP policy; one blocked subresource can make an otherwise correct build fail.

### The WASI optional package was not installed

WASI packages use `cpu: ["wasm32"]` and are skipped by default. Configure the
package manager's supported architectures or install with npm's `--cpu=wasm32`
as shown in [WebAssembly: install the package](/docs/concepts/webassembly#install-the-webassembly-package).

With a loader generated by `@napi-rs/cli` 3.7 or newer:

- `NAPI_RS_FORCE_WASI=true` attempts the WASI path even when native loaded.
- `NAPI_RS_FORCE_WASI=error` also throws if no WASI binding can be found.
- `1`, `0`, `false`, and other strings do not force WASI.

Use `error` in tests so a missing WASI package cannot silently fall back to the
native addon.

### Browser worker errors are invisible

Set `napi.wasm.browser.errorEvent` to `true`. The generated worker forwards an
error to the window as `napi-rs-worker-error`:

```js
window.addEventListener('napi-rs-worker-error', (event) => {
  console.error(event.detail)
})
```

### Works in Node but not Bun or Deno

Do not assume Node's WASI implementation exists with the same API elsewhere.
WASI execution in Bun and Deno has an open incompatibility report
([napi-rs#2965](https://github.com/napi-rs/napi-rs/issues/2965)). Mark the
runtime unsupported or provide a separately tested loader until that product
gap is resolved.

## Report an actionable issue

Include:

- minimal Rust source, `Cargo.toml`, `build.rs`, `package.json`, and JavaScript
  reproduction;
- complete commands and the first error with its `cause` chain;
- Node/runtime, CLI, Rust, host, target, CPU, and libc versions;
- whether plain Node works before a test runner or bundler is added;
- output of `file` and the platform dependency inspection command;
- whether the artifact is debug/release, native/WASI, local/optional package;
- for lifecycle bugs, a bounded stress test and the exact shutdown sequence.

::: info
Remove credentials, absolute private paths, and proprietary input data, but
do not remove the platform, target triple, or original operating-system loader
message. Those details often identify the failing layer immediately.

:::
