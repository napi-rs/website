---
title: 'NAPI Config'
description: Config schema of NAPI-RS.
---

# NAPI Config

The config schema of **NAPI-RS**.

::: tip
All the fields in `napi` is optional.
:::

## Schema

```ts
{
  napi?: {
    binaryName?: string
    targets?: string[],
    packageName?: string,
    npmClient?: string
    constEnum?: boolean
    dtsHeader?: string
    dtsHeaderFile?: string
    wasm?: {
      initialMemory?: number
      maximumMemory?: number
      browser?: {
        fs?: boolean
        asyncInit?: boolean
      }
    }
  }
}
```

| Field                    |                     Default                     | Description                                                                                                                                                                                                                                                                                   |
| ------------------------ | :---------------------------------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `binaryName`             |    <span class="chalk-green">`index`</span>     | The binary file name of generated `.node` file. Eg <span class="chalk-green">`[NAME].[TRIPLE?].node`</span> becomes <span class="chalk-green">`index.win32-x64-msvc.node`</span>                                                                                                              |
| `targets`                |      <span class="chalk-green">`[]`</span>      | The target triples your project ships for, used for scaffolding and packaging. Setting it does not make `napi build` compile multiple targets — see the note below for the one thing `napi build` reads from it. Target triples could be found in the output of `rustup target list` command. |
| `packageName`            |  <span class="chalk-green">`undefined`</span>   | Override the `name` field in `package.json`. See [Build#js-package-name](./build#note-for---js-package-name) for usage.                                                                                                                                                                       |
| `npmClient`              |     <span class="chalk-green">`npm`</span>      | Specify a different NPM client for usage when executing NPM actions such as publishing.                                                                                                                                                                                                       |
| `constEnum`              |    <span class="chalk-green">`false`</span>     | Whether to generate `const enum` for the generated `index.d.ts` file.                                                                                                                                                                                                                         |
| `dtsHeader`              |  <span class="chalk-green">`undefined`</span>   | Header string that prepend to the generated `index.d.ts` file.                                                                                                                                                                                                                                |
| `dtsHeaderFile`          |  <span class="chalk-green">`undefined`</span>   | File path that contains the header string that prepend to the generated `index.d.ts` file. If both `dtsHeader` and `dtsHeaderFile` are provided, `dtsHeaderFile` will be used                                                                                                                 |
| `wasm.initialMemory`     | <span class="chalk-green">`4000` (256mb)</span> | Initial memory size for the generated WebAssembly module. See [WebAssembly.Memory](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory) for more details.                                                                                                        |
| `wasm.maximumMemory`     | <span class="chalk-green">`65536` (4GiB)</span> | Maximum memory size for the generated WebAssembly module. See [WebAssembly.Memory](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory) for more details.                                                                                                        |
| `wasm.browser.fs`        |    <span class="chalk-green">`false`</span>     | Whether to enable the `node:fs` module polyfill for the generated WebAssembly module.                                                                                                                                                                                                         |
| `wasm.browser.asyncInit` |    <span class="chalk-green">`false`</span>     | Whether to enable the async initialization for the generated WebAssembly module.                                                                                                                                                                                                              |

::: info
`targets` drives scaffolding and packaging: `napi new` uses it to generate
the CI matrix, [`napi create-npm-dirs`](./create-npm-dirs) creates one npm
package per target, and [`napi artifacts`](./artifacts) collects the
binaries built for these targets. Setting it does **not** make `napi build`
compile multiple targets — `napi build` builds exactly one target per
invocation, selected with its `--target` flag. The one thing `napi build`
does read from `targets` is the WASI entry: it derives the `.wasm` binding
filename from the WASI target listed there, and skips emitting the WASI
binding files (`<binaryName>.wasi.cjs` and the related files) entirely when no WASI
target is listed. The cross-compilation flags
(`--use-napi-cross`, `--cross-compile`, `--use-cross`) have no config-file
equivalent either: they can only be passed on the `napi build` command line.

:::

## What is `target triple`

See [rustc/platform-support](https://doc.rust-lang.org/nightly/rustc/platform-support.html) and [LLVM/CrossCompilation](https://clang.llvm.org/docs/CrossCompilation.html#target-triple)

> Targets are identified by their "target triple" which is the string to inform the compiler what kind of output that should be produced.

> The triple has the general format `<arch><sub>-<vendor>-<sys>-<abi>`, where:
>
> - `arch` = `x86_64`, `i386`, `arm`, `thumb`, `mips`, etc.
> - `sub` = for ex. on ARM: `v5`, `v6m`, `v7a`, `v7m`, etc.
> - `vendor` = `pc`, `apple`, `nvidia`, `ibm`, etc.
> - `sys` = `none`, `linux`, `win32`, `darwin`, `cuda`, etc.
> - `abi` = `eabi`, `gnu`, `android`, `macho`, `elf`, etc.

Once you know which triples you ship, see [Cross build](../cross-build) for how to build each of them from your host.
