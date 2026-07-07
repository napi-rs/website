---
title: 'NAPI 配置'
description: NAPI-RS 的配置结构。
---

# NAPI 配置

**NAPI-RS** 的配置结构。

::: tip
`napi` 中的所有字段都是可选的。
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

| 字段                     |                     默认值                      | 描述                                                                                                                                                                                                       |
| ------------------------ | :---------------------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `binaryName`             |    <span class="chalk-green">`index`</span>     | 生成的 `.node` 文件的二进制文件名。例如 <span class="chalk-green">`[NAME].[TRIPLE?].node`</span> 会变成 <span class="chalk-green">`index.win32-x64-msvc.node`</span>                                       |
| `targets`                |      <span class="chalk-green">`[]`</span>      | 项目要发布的 target triple 列表，用于脚手架和打包。设置它并不会让 `napi build` 编译多个目标 —— `napi build` 从中读取的唯一一项内容见下方说明。target triple 可以在 `rustup target list` 命令的输出中找到。 |
| `packageName`            |  <span class="chalk-green">`undefined`</span>   | 覆盖 `package.json` 中的 `name` 字段。用法参见 [Build#js-package-name](./build#%E5%85%B3%E4%BA%8E---js-package-name-%E7%9A%84%E8%AF%B4%E6%98%8E)。                                                         |
| `npmClient`              |     <span class="chalk-green">`npm`</span>      | 指定执行 NPM 操作（例如发布）时使用的其他 NPM 客户端。                                                                                                                                                     |
| `constEnum`              |    <span class="chalk-green">`false`</span>     | 是否在生成的 `index.d.ts` 文件中生成 `const enum`。                                                                                                                                                        |
| `dtsHeader`              |  <span class="chalk-green">`undefined`</span>   | 前置到生成的 `index.d.ts` 文件开头的文件头字符串。                                                                                                                                                         |
| `dtsHeaderFile`          |  <span class="chalk-green">`undefined`</span>   | 包含前置到生成的 `index.d.ts` 文件开头的文件头字符串的文件路径。如果同时提供了 `dtsHeader` 和 `dtsHeaderFile`，则使用 `dtsHeaderFile`                                                                      |
| `wasm.initialMemory`     | <span class="chalk-green">`4000` (256mb)</span> | 生成的 WebAssembly 模块的初始内存大小。详见 [WebAssembly.Memory](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory)。                                                       |
| `wasm.maximumMemory`     | <span class="chalk-green">`65536` (4GiB)</span> | 生成的 WebAssembly 模块的最大内存大小。详见 [WebAssembly.Memory](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory)。                                                       |
| `wasm.browser.fs`        |    <span class="chalk-green">`false`</span>     | 是否为生成的 WebAssembly 模块启用 `node:fs` 模块 polyfill。                                                                                                                                                |
| `wasm.browser.asyncInit` |    <span class="chalk-green">`false`</span>     | 是否为生成的 WebAssembly 模块启用异步初始化。                                                                                                                                                              |

::: info
`targets` 驱动的是脚手架和打包：`napi new` 用它生成 CI
matrix，[`napi create-npm-dirs`](/docs/cli/create-npm-dirs) 为每个目标创建一个 npm
包，[`napi artifacts`](/docs/cli/artifacts) 收集为这些目标构建的二进制。设置它并**不会**让
`napi build` 编译多个目标 —— `napi build` 每次调用只构建一个目标，由它的
`--target` 标志选定。`napi build` 从 `targets` 中读取的唯一一项内容是 WASI
条目：它根据其中列出的 WASI 目标推导 `.wasm`
绑定文件名；当其中没有列出任何 WASI 目标时，则完全跳过 WASI
绑定文件（`<binaryName>.wasi.cjs` 及相关文件）的生成。交叉编译标志
（`--use-napi-cross`、`--cross-compile`、`--use-cross`）同样没有配置文件中的等价物：
它们只能在 `napi build` 命令行上传入。

:::

## 什么是 `target triple`

参见 [rustc/platform-support](https://doc.rust-lang.org/nightly/rustc/platform-support.html) 和 [LLVM/CrossCompilation](https://clang.llvm.org/docs/CrossCompilation.html#target-triple)

> 目标由它的「target triple」标识，这个字符串用来告知编译器应该产出何种输出。

> triple 的一般格式为 `<arch><sub>-<vendor>-<sys>-<abi>`，其中：
>
> - `arch` = `x86_64`、`i386`、`arm`、`thumb`、`mips` 等
> - `sub` = 例如在 ARM 上有 `v5`、`v6m`、`v7a`、`v7m` 等
> - `vendor` = `pc`、`apple`、`nvidia`、`ibm` 等
> - `sys` = `none`、`linux`、`win32`、`darwin`、`cuda` 等
> - `abi` = `eabi`、`gnu`、`android`、`macho`、`elf` 等

一旦确定了你要发布哪些 triple，参见[交叉编译](../cross-build)了解如何在你的宿主机上构建它们。
