---
title: 支持与兼容性
description: 理解 Node-API ABI 兼容性、已测试运行时和 napi-rs 构建目标。
---

# 支持与兼容性

对原生插件来说，“支持”可能表示多种不同含义。napi-rs 会明确区分这些边界：

| 问题                                          | 事实来源                                                         |
| --------------------------------------------- | ---------------------------------------------------------------- |
| 编译后的插件能否在某个 Node.js 版本加载？     | 插件编译时使用的 Node-API 级别，以及运行时提供的 Node-API 版本。 |
| `@napi-rs/cli` 能否运行？                     | CLI 包自身的 Node.js engine 要求。                               |
| 某个 Node/运行时组合是否持续接受测试？        | 当前 napi-rs 源码仓库的 CI 工作流。                              |
| `napi new` 是否为某个目标生成构建与发布路径？ | 所选 Yarn 或 pnpm 模板中签入的矩阵与 `napi.targets`。            |
| Rust 能否编译某个目标三元组？                 | Rust 目标支持以及所需链接器、SDK、原生依赖和交叉构建机制。       |
| 上游 Node.js 是否发布该目标的二进制文件？     | Node.js release 产物；其范围比 napi-rs CLI 能解析的三元组更窄。  |

仅仅是可接受的目标三元组或 ABI 兼容的 Node-API 级别，并不表示上述所有组合都经过测试。

## Node-API ABI 兼容性

Node-API 在不同 Node.js 版本间提供 ABI 稳定性。针对 Node-API 级别 `N` 构建的原生二进制文件，通常可以在仍提供级别 `N` 的后续 Node.js 版本上加载，无需针对每个 Node 大版本重新构建。

该保证不涵盖：

- 所选 Node-API 级别之后才引入的 API。
- 操作系统、CPU、libc、C++ runtime 或最低部署目标兼容性。
- 替代运行时 Node-API 实现中的缺陷。
- 你自己的依赖所链接的原生库。

`napi new` 会询问最低 Node-API 级别，并在生成项目中同时写入对应的 `napiN` Cargo feature 和 `engines.node` 范围。脚手架目前提供 Node-API 1 到 9，默认为级别 4。请选择能满足所用 API 的最低级别，然后在它声称支持的最早 Node.js 运行时上测试。异步支持等 feature 仍可能提高实际 Node-API 下限。

## CLI 与 Rust 要求

- `@napi-rs/cli` 声明 `>=23.5.0 || ^22.13.0 || ^20.17.0`，与其交互式提示依赖一致。当前 CLI 构建请使用最新的 **Node.js 22 LTS（22.13+）或 Node.js 24+**。即使构建插件的 CLI 无法在较旧 Node.js 上运行，插件本身仍可以面向兼容的旧运行时。
- 当前 napi-rs v3 工作区声明的最低 Rust 版本是 **Rust 1.88**。
- 生成模板中的 `engines.node` 描述的是插件包，而不是构建 CLI。

## napi-rs 源码仓库测试什么

主要的 [napi-rs 源码 CI 矩阵](https://github.com/napi-rs/napi-rs/blob/main/.github/workflows/test-release.yaml)目前在 Linux、macOS 和 Windows 的主要任务中测试 **Node.js 22、24 和 26**。其他 Docker 目标测试目前使用 Node.js 22 和 24。

这是项目当前的回归覆盖范围，而不是完整的 Node-API 兼容范围。矩阵以外的 Node 版本可能在 ABI 上兼容，但不能准确地说它由当前源码工作流持续测试。

生成的包模板维护自己的较小测试矩阵。请阅读复制到项目中的工作流，并把该签入文件视为你的包的支持契约。

## JavaScript 运行时

| 运行时                 | 状态                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js 原生插件**   | 主要运行时。发布声明仍应限定在包自身测试的 Node 版本和平台。                                                                                   |
| **Bun 原生插件**       | 尽力支持。源码仓库会运行 latest-Bun 任务，但测试步骤设置了 `continue-on-error`，因此 Bun 失败不会阻止 napi-rs 发布。声称支持前请测试实际插件。 |
| **Deno 原生插件**      | 不在当前 napi-rs 源码 CI 矩阵中。不要仅从 Node-API 兼容性推断 Deno 支持。                                                                      |
| **Node.js WASI 回退**  | 源码和生成模板工作流会在所选 Node 版本上测试。它与原生 `.node` 插件使用不同产物和加载器。                                                      |
| **浏览器 WASI**        | 通过生成的浏览器/worker 绑定提供。需要 WebAssembly 线程、worker 和适当的跨源隔离 header。请显式测试目标浏览器。                                |
| **Bun/Deno WASI 回退** | 仍存在已知兼容性缺口；参见 [napi-rs issue #2965](https://github.com/napi-rs/napi-rs/issues/2965)。不要把该路径描述为普遍受支持。               |

::: info
包可以通过添加自己的阻断式运行时测试，提供比 napi-rs 本身更强的运行时支持。请在包的支持策略中记录这些测试，而不是依赖框架首页。

:::

## CLI 接受的目标

当前 CLI 可识别的目标系列包括：

- macOS x64、arm64 和通用二进制文件。
- Windows MSVC x64、x86 和 arm64，以及 Windows GNU x64。
- Linux glibc x64、arm64、armv7、loongarch64、riscv64gc、ppc64le 和 s390x。
- Linux musl x64、arm64 和 armv7。
- Android arm64 和 armv7。
- FreeBSD x64。
- OpenHarmony x64 和 arm64。
- threaded WASI preview-1 目标。

该列表描述的是解析与打包词汇。有些目标需要手动安装链接器或 SDK，有些只能从特定宿主机构建，还有一些没有官方 Node.js 运行时二进制文件。

## `napi new` 生成的目标

`napi new` 会复制两个持续维护仓库中的一个：

- [Yarn 包模板](https://github.com/napi-rs/package-template)
- [pnpm 包模板](https://github.com/napi-rs/package-template-pnpm)

脚手架只过滤模板中现有的任务；不会为每个可接受三元组合成新的 CI 配方。当前模板为以下常见矩阵提供构建/打包路径：

| 平台         | 模板支持的目标          |
| ------------ | ----------------------- |
| macOS        | x64、arm64              |
| Windows MSVC | x64、x86、arm64         |
| Linux glibc  | x64、arm64、armv7       |
| Linux musl   | x64、arm64              |
| Android      | arm64、armv7            |
| FreeBSD      | x64                     |
| WASI         | threaded preview-1 目标 |

两个持续维护的模板目前都实现了该矩阵。由于 `napi new` 只过滤模板中已签入的配置，而不会为目标合成配方，因此请把生成的 `package.json` 和 `.github/workflows/CI.yml` 作为新包的支持基线。

OpenHarmony、Windows GNU、armv7 musl、macOS universal、loongarch64、riscv64gc、ppc64le 和 s390x 等目标可能被 CLI 接受，却没有完整的脚手架构建与发布路径。全选目标也不会改变这一点。

## 添加或声明一个目标

把某个目标列为受支持之前：

1. 将三元组添加到 `napi.targets`。
2. 运行 `napi create-npm-dirs`，检查生成的包限制。
3. 使用正确的宿主机、链接器/SDK 和交叉构建模式添加 CI 构建。
4. 使用 `napi artifacts` 上传并收集产物。
5. 在真实或忠实模拟的目标环境中运行二进制文件。
6. 测试你声称支持的最旧操作系统、libc、部署目标和 Node.js 版本。
7. 验证在干净环境中安装根包时，会选择并加载预期的可选包。

宿主/目标决策树参见[交叉编译](/docs/cross-build)，完整打包流程参见[向现有项目添加目标](/docs/cross-build#向现有项目添加新目标)。

## 如何准确描述支持范围

推荐使用这样的声明：

> 每个列出的平台提供一个针对 Node-API 8 构建的二进制文件。CI 在 macOS arm64/x64、Windows x64 和 Linux x64 glibc/musl 上测试 Node.js 22 与 24。其他 Node-API 兼容的 Node.js 版本预计可以工作，但不在阻断矩阵中。

避免使用“所有 Node 版本”或“所有平台”。请包含 Node-API 级别、已测试 Node 版本、OS/CPU/libc 矩阵、最低 OS 或 glibc 版本，以及替代运行时属于阻断式、尽力支持还是未测试。
