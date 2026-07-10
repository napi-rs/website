---
title: 'NAPI Config'
description: Configure NAPI-RS builds, generated bindings, targets, and WASI output.
---

# NAPI Config

Put the configuration under the `napi` key in `package.json`:

**package.json**

```json
{
  "name": "@scope/addon",
  "napi": {
    "binaryName": "addon",
    "targets": ["x86_64-unknown-linux-gnu", "aarch64-apple-darwin"]
  }
}
```

Commands that expose `--config-path` can instead read a standalone JSON file.
When both sources are present, the standalone config takes precedence. All
user-supplied fields are optional.

## Schema

```ts
{
  napi?: {
    binaryName?: string
    targets?: string[]
    packageName?: string
    npmClient?: string
    constEnum?: boolean
    runtimeStringEnum?: boolean
    dtsHeader?: string
    dtsHeaderFile?: string
    wasm?: {
      initialMemory?: number
      maximumMemory?: number
      browser?: {
        fs?: boolean
        asyncInit?: boolean
        buffer?: boolean
        errorEvent?: boolean
      }
    }
  }
}
```

## Fields and effective defaults

| Field                     |                    Default                     | Description                                                                                                                                                                                                                   |
| ------------------------- | :--------------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `binaryName`              |    <span class="chalk-green">`index`</span>    | Base name of generated native and WASI files. A platform build produces a name such as <span class="chalk-green">`index.win32-x64-msvc.node`</span>.                                                                          |
| `targets`                 |     <span class="chalk-green">`[]`</span>      | Target triples the project packages and publishes. This is not a multi-target build command.                                                                                                                                  |
| `packageName`             |           root `package.json` `name`           | Package name used by generated loaders and per-platform package names. Override it when the JavaScript package name differs from the root package metadata; see [Build: JS package name](./build#note-for---js-package-name). |
| `npmClient`               |     <span class="chalk-green">`npm`</span>     | Command used for npm operations such as publishing each platform package.                                                                                                                                                     |
| `constEnum`               |    <span class="chalk-green">`true`</span>     | Generate TypeScript `const enum` declarations. The effective type-generation default is `true` when neither config nor CLI overrides it.                                                                                      |
| `runtimeStringEnum`       |    <span class="chalk-green">`false`</span>    | With `constEnum: false`, emit `#[napi(string_enum)]` as a runtime `enum` instead of a type-only string union. It has no effect while `constEnum` is `true`.                                                                   |
| `dtsHeader`               |  <span class="chalk-green">`undefined`</span>  | String prepended to the generated declaration file.                                                                                                                                                                           |
| `dtsHeaderFile`           |  <span class="chalk-green">`undefined`</span>  | Path, relative to the command's working directory, whose content is prepended to the generated declaration file. It takes precedence over `dtsHeader`.                                                                        |
| `wasm.initialMemory`      | <span class="chalk-green">`4000` pages</span>  | Initial shared WebAssembly memory, approximately 250 MiB.                                                                                                                                                                     |
| `wasm.maximumMemory`      | <span class="chalk-green">`65536` pages</span> | Maximum shared WebAssembly memory, 4 GiB.                                                                                                                                                                                     |
| `wasm.browser.fs`         |    <span class="chalk-green">`false`</span>    | Include the in-memory filesystem and filesystem proxy in browser WASI bindings.                                                                                                                                               |
| `wasm.browser.asyncInit`  |    <span class="chalk-green">`false`</span>    | Use emnapi's asynchronous module-instantiation path for the browser binding.                                                                                                                                                  |
| `wasm.browser.buffer`     |    <span class="chalk-green">`false`</span>    | Import `Buffer` and inject it into the emnapi context used by the browser binding.                                                                                                                                            |
| `wasm.browser.errorEvent` |    <span class="chalk-green">`false`</span>    | Forward worker failures to a browser `napi-rs-worker-error` `CustomEvent`, including captured worker error output.                                                                                                            |

One WebAssembly memory page is 64 KiB. The memory settings are written into
the generated Node and browser WASI loaders; they are not Cargo memory limits.

::: info
`runtimeStringEnum: true` requires `constEnum: false`. The equivalent build
flags are `--runtime-string-enum --no-const-enum`.

:::

## What `targets` controls

`targets` drives packaging:

- [`napi create-npm-dirs`](./create-npm-dirs) creates one npm directory per
  target.
- [`napi artifacts`](./artifacts) maps built files into those directories.
- [`napi pre-publish`](./pre-publish) versions and publishes those packages.
- A WASI target enables generation of `<binaryName>.wasi.cjs` and the related
  browser and worker files.

Setting `targets` does **not** make `napi build` compile each entry. Every build
invocation produces one target selected by `--target`,
`CARGO_BUILD_TARGET`, or the host default. Likewise, the cross-compilation
flags (`--use-napi-cross`, `--cross-compile`, and `--use-cross`) have no config
equivalent.

The target list also does not create arbitrary CI jobs. `napi new` filters the
jobs already present in its selected template. If you add another accepted
target, add its build job and verify its runtime separately. See [Support and
compatibility](/docs/more/support-compatibility) and [Cross build](../cross-build).

## Deprecated v2 fields

The CLI still reads these fields for compatibility, but new projects should
not use them:

| Deprecated                                            | Replacement       |
| ----------------------------------------------------- | ----------------- |
| `napi.name`                                           | `napi.binaryName` |
| `napi.triples.defaults` and `napi.triples.additional` | `napi.targets`    |

The old nested `napi.package.name` field is **not** read by the v3 config
normalizer. Move that value explicitly to `napi.packageName`.

## What is a target triple?

See [Rust platform support](https://doc.rust-lang.org/nightly/rustc/platform-support.html)
and [LLVM cross-compilation](https://clang.llvm.org/docs/CrossCompilation.html#target-triple).
A target triple describes the architecture, vendor, operating system, and ABI
of the artifact, for example:

```text
x86_64-unknown-linux-gnu
└─ arch  └ vendor └ system └ ABI
```

Once you know which triples you intend to ship, use [Cross build](../cross-build)
to choose and verify the build mechanism for each one.
