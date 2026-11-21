---
title: 'NAPI 配置'
description: 配置 NAPI-RS 构建、生成的绑定、目标和 WASI 输出。
---

# NAPI 配置

将配置放在 `package.json` 的 `napi` 键下：

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

提供 `--config-path` 的命令也可以读取独立 JSON 文件。两种来源同时存在时，以独立配置为准。所有用户提供的字段都是可选的。

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
      stackSizeBytes?: number
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

## 字段与实际默认值

| 字段                      |                      默认值                      | 描述                                                                                                                                                                                    |
| ------------------------- | :----------------------------------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `binaryName`              |     <span class="chalk-green">`index`</span>     | 生成的原生与 WASI 文件的基本名称。平台构建会生成类似 <span class="chalk-green">`index.win32-x64-msvc.node`</span> 的名称。                                                              |
| `targets`                 |      <span class="chalk-green">`[]`</span>       | 项目打包并发布的 target triples。这不是多目标构建命令。                                                                                                                                 |
| `packageName`             |           根 `package.json` 的 `name`            | 生成的加载器和各平台包使用的包名。当 JavaScript 包名与根包元数据不同时可覆盖它；参见[构建：JS 包名](./build#关于---js-package-name-的说明)。                                            |
| `npmClient`               |      <span class="chalk-green">`npm`</span>      | 发布各平台包等 npm 操作所使用的命令。                                                                                                                                                   |
| `constEnum`               |     <span class="chalk-green">`true`</span>      | 生成 TypeScript `const enum` 声明。当配置和 CLI 都未覆盖时，类型生成的实际默认值是 `true`。                                                                                             |
| `runtimeStringEnum`       |     <span class="chalk-green">`false`</span>     | 与 `constEnum: false` 一起使用时，将 `#[napi(string_enum)]` 生成为运行时 `enum`，而不是仅存在于类型层的字符串联合。`constEnum` 为 `true` 时不起作用。                                   |
| `dtsHeader`               |   <span class="chalk-green">`undefined`</span>   | 前置到生成的声明文件的字符串。                                                                                                                                                          |
| `dtsHeaderFile`           |   <span class="chalk-green">`undefined`</span>   | 一个相对于命令工作目录的文件路径，其内容会前置到生成的声明文件。它的优先级高于 `dtsHeader`。                                                                                            |
| `wasm.initialMemory`      |  <span class="chalk-green">`4000` pages</span>   | 初始共享 WebAssembly 内存，约 250 MiB。                                                                                                                                                 |
| `wasm.maximumMemory`      |  <span class="chalk-green">`65536` pages</span>  | 最大共享 WebAssembly 内存，4 GiB。                                                                                                                                                      |
| `wasm.stackSizeBytes`     | <span class="chalk-green">`64000000` 字节</span> | 主线程 WASI 线性内存栈大小（`-zstack-size`），约 61.04 MiB。必须为严格小于 4 GiB（`4294967296`）的 16 字节对齐正整数。需要 `napi-build >= 2.7.0`；参见[WASI 栈大小](#wasi-stack-size)。 |
| `wasm.browser.fs`         |     <span class="chalk-green">`false`</span>     | 在浏览器 WASI 绑定中包含内存文件系统和文件系统代理。                                                                                                                                    |
| `wasm.browser.asyncInit`  |     <span class="chalk-green">`false`</span>     | 浏览器绑定使用 emnapi 的异步模块实例化路径。                                                                                                                                            |
| `wasm.browser.buffer`     |     <span class="chalk-green">`false`</span>     | 导入 `Buffer` 并注入浏览器绑定所使用的 emnapi 上下文。                                                                                                                                  |
| `wasm.browser.errorEvent` |     <span class="chalk-green">`false`</span>     | 将 worker 故障转发为浏览器 `napi-rs-worker-error` `CustomEvent`，其中包含捕获的 worker 错误输出。                                                                                       |

一个 WebAssembly 内存页为 64 KiB。`wasm.initialMemory`、`wasm.threadlessInitialMemory` 和 `wasm.maximumMemory` 均以页为单位并写入生成的 Node 和浏览器 WASI 加载器；它们不是 Cargo 内存限制。`wasm.stackSizeBytes` 以**字节**为单位，并在链接阶段转发给 `napi-build`。

::: info
`runtimeStringEnum: true` 要求 `constEnum: false`。对应的构建标志是 `--runtime-string-enum --no-const-enum`。

:::

## WASI 栈大小 {#wasi-stack-size}

`wasm.stackSizeBytes` 用于设置 WASI 链接器参数 `-zstack-size`，仅控制**主线程**的线性内存栈大小（`__stack_pointer`）。在 `wasm32-wasip1-threads` 目标上，worker 线程的栈通过 `malloc` 从堆中分配。自定义栈大小需要 `napi-build >= 2.7.0`。

该值必须是严格小于 4 GiB（`4294967296` 字节）的 16 字节对齐正整数。同时配置多个来源时，NAPI-RS 按以下优先级解析：

| 优先级 | 来源                                   | 说明                                                                               |
| :----: | -------------------------------------- | ---------------------------------------------------------------------------------- |
|   1    | `NAPI_WASI_STACK_SIZE` 环境变量        | 非空十进制整数字节数。空字符串（`""`）视为未设置。                                 |
|   2    | `napi.wasm.stackSizeBytes`             | 当环境变量未设置或为空时，由 `@napi-rs/cli` 作为 `NAPI_WASI_STACK_SIZE` 转发。     |
|   3    | `build.rs`（`napi_build::setup_with`） | `napi_build::setup_with(napi_build::SetupOptions::new().wasi_stack_size(bytes))`。 |
|   4    | 默认值                                 | `64000000` 字节（约 61.04 MiB）。                                                  |

`@napi-rs/cli` 在调用 Cargo 前会校验 `napi.wasm.stackSizeBytes` 和 `NAPI_WASI_STACK_SIZE`（包括与 `maximumMemory` 和已配置的初始内存的一致性）。链接完成后，它还会检查生成的 `.wasm` 产物，确认 `__stack_pointer` 与请求的栈大小一致（从而捕获旧版 `napi-build < 2.7.0` 或手动 `-zstack-size` 覆盖），并确认显式配置的 `initialMemory` 或 `threadlessInitialMemory` 满足模块的 `env.memory` 最小下限。

有关栈大小与 `env.memory` 的关系及示例，参见[WebAssembly 与 WASI：栈大小与内存下限](/cn/docs/concepts/webassembly#stack-size-and-memory-floor)。

## `targets` 控制什么

`targets` 驱动打包流程：

- [`napi create-npm-dirs`](./create-npm-dirs) 为每个目标创建一个 npm 目录。
- [`napi artifacts`](./artifacts) 将构建文件放入这些目录。
- [`napi pre-publish`](./pre-publish) 设置版本并发布这些包。
- WASI 目标会启用 `<binaryName>.wasi.cjs` 及相关浏览器和 worker 文件的生成。

设置 `targets` **不会**让 `napi build` 编译其中每一项。每次构建只生成一个由 `--target`、`CARGO_BUILD_TARGET` 或宿主机默认值选择的目标。同样，交叉编译标志（`--use-napi-cross`、`--cross-compile` 和 `--use-cross`）没有对应的配置字段。

目标列表也不会创建任意 CI 任务。`napi new` 只会过滤所选模板中已经存在的任务。如果添加其他可接受目标，请同时添加其构建任务，并单独验证运行时。参见[支持与兼容性](/cn/docs/more/support-compatibility)和[交叉编译](../cross-build)。

## 已弃用的 v2 字段

CLI 仍会读取这些字段以保持兼容，但新项目不应再使用：

| 已弃用                                               | 替代项            |
| ---------------------------------------------------- | ----------------- |
| `napi.name`                                          | `napi.binaryName` |
| `napi.triples.defaults` 和 `napi.triples.additional` | `napi.targets`    |

v3 配置规范化器**不会**读取旧的嵌套字段 `napi.package.name`。请显式把该值移到 `napi.packageName`。

## 什么是 target triple？

参见 [Rust 平台支持](https://doc.rust-lang.org/nightly/rustc/platform-support.html)和 [LLVM 交叉编译](https://clang.llvm.org/docs/CrossCompilation.html#target-triple)。target triple 描述产物的架构、供应商、操作系统和 ABI，例如：

```text
x86_64-unknown-linux-gnu
└─ arch  └ vendor └ system └ ABI
```

确定要发布哪些 target triple 后，请使用[交叉编译](../cross-build)为每个目标选择并验证构建机制。
