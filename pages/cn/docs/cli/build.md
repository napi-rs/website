---
title: 'Build'
description: napi build 命令（@napi-rs/cli）、它的交叉编译标志，以及它实际运行的命令与环境变量。
---

# Build

构建 NAPI-RS 项目

## 用法

```sh
# CLI
napi build [--options]
```

```typescript
// Programmatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().build({
  // options
})
```

## 选项

| 选项              | CLI 选项              | 类型     | 必填  | 默认值 | 描述                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | --------------------- | -------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|                   | --help,-h             |          |       |        | 获取帮助                                                                                                                                                                                                                                                                                                                                                                                                           |
| target            | --target,-t           | string   | false |        | 构建指定 target triple 的产物，透传给 <span class="chalk-green">cargo build --target</span>                                                                                                                                                                                                                                                                                                                        |
| cwd               | --cwd                 | string   | false |        | napi 命令执行时的工作目录，其他所有路径选项都相对于该路径                                                                                                                                                                                                                                                                                                                                                          |
| manifestPath      | --manifest-path       | string   | false |        | <span class="chalk-rust">Cargo.toml</span> 的路径                                                                                                                                                                                                                                                                                                                                                                  |
| configPath        | --config-path,-c      | string   | false |        | <span class="chalk-green">napi</span> 配置 json 文件的路径                                                                                                                                                                                                                                                                                                                                                         |
| packageJsonPath   | --package-json-path   | string   | false |        | <span class="chalk-green">package.json</span> 的路径                                                                                                                                                                                                                                                                                                                                                               |
| targetDir         | --target-dir          | string   | false |        | 存放 crate 全部构建产物的目录，参见 <span class="chalk-green">cargo build --target-dir</span>                                                                                                                                                                                                                                                                                                                      |
| outputDir         | --output-dir,-o       | string   | false |        | 所有构建产出文件的存放路径。默认为 crate 目录                                                                                                                                                                                                                                                                                                                                                                      |
| platform          | --platform            | boolean  | false |        | 在生成的 nodejs 绑定文件名中加入平台 triple，例如：<span class="chalk-green">[name].linux-x64-gnu.node</span>                                                                                                                                                                                                                                                                                                      |
| jsPackageName     | --js-package-name     | string   | false |        | 生成的 js 绑定文件中的包名。仅在使用 <span class="chalk-green">--platform</span> 标志时生效                                                                                                                                                                                                                                                                                                                        |
| constEnum         | --const-enum          | boolean  | false | true   | 生成 TypeScript `const enum` 声明。使用 <span class="chalk-green">--no-const-enum</span> 生成普通形式/仅类型形式。                                                                                                                                                                                                                                                                                                 |
| runtimeStringEnum | --runtime-string-enum | boolean  | false | false  | 与 <span class="chalk-green">--no-const-enum</span> 一起使用时，将 <span class="chalk-rust">#[napi(string_enum)]</span> 生成为运行时枚举，而不是仅存在于类型层的字符串联合。启用 const enum 时此选项不起作用。                                                                                                                                                                                                     |
| jsBinding         | --js                  | string   | false |        | 生成的 JS 绑定文件的路径和文件名。仅在使用 <span class="chalk-green">--platform</span> 标志时生效。相对于 <span class="chalk-green">--output-dir</span>。                                                                                                                                                                                                                                                          |
| noJsBinding       | --no-js               | boolean  | false |        | 是否禁用 JS 绑定文件的生成。仅在使用 <span class="chalk-green">--platform</span> 标志时生效。                                                                                                                                                                                                                                                                                                                      |
| dts               | --dts                 | string   | false |        | 生成的类型定义文件的路径和文件名。相对于 <span class="chalk-green">--output-dir</span>                                                                                                                                                                                                                                                                                                                             |
| dtsHeader         | --dts-header          | string   | false |        | 生成的类型定义文件的自定义文件头。仅在启用 <span class="chalk-green">typedef</span> feature 时生效。                                                                                                                                                                                                                                                                                                               |
| noDtsHeader       | --no-dts-header       | boolean  | false |        | 是否禁用生成的类型定义文件的默认文件头。仅在启用 <span class="chalk-green">typedef</span> feature 时生效。                                                                                                                                                                                                                                                                                                         |
| dtsCache          | --dts-cache           | boolean  | false | true   | 是否启用 dts 缓存，默认为 true                                                                                                                                                                                                                                                                                                                                                                                     |
| esm               | --esm                 | boolean  | false |        | 是否生成 ESM 格式而非 CJS 格式的 JS 绑定文件。仅在使用 <span class="chalk-green">--platform</span> 标志时生效。                                                                                                                                                                                                                                                                                                    |
| pipe              | --pipe                | string   | false |        | 将每个生成的产出文件通过管道传给指定命令，例如 <span class="chalk-green">napi build --pipe "npx prettier --write"</span>                                                                                                                                                                                                                                                                                           |
| strip             | --strip,-s            | boolean  | false |        | 是否 strip 动态库以获得最小的文件体积                                                                                                                                                                                                                                                                                                                                                                              |
| release           | --release,-r          | boolean  | false |        | 以 release 模式构建                                                                                                                                                                                                                                                                                                                                                                                                |
| verbose           | --verbose,-v          | boolean  | false |        | 详细打印构建命令的执行过程                                                                                                                                                                                                                                                                                                                                                                                         |
| bin               | --bin                 | string   | false |        | 只构建指定的 binary                                                                                                                                                                                                                                                                                                                                                                                                |
| package           | --package,-p          | string   | false |        | 构建指定的库，或 cwd 下的库                                                                                                                                                                                                                                                                                                                                                                                        |
| profile           | --profile             | string   | false |        | 使用指定的 profile 构建产物                                                                                                                                                                                                                                                                                                                                                                                        |
| crossCompile      | --cross-compile,-x    | boolean  | false |        | [实验性] 通过替换 cargo 子命令进行交叉编译：从非 Windows 宿主机构建 Windows MSVC 目标时使用 <span class="chalk-green">cargo-xwin</span>；Windows GNU 目标会被拒绝。所有非 Windows 目标使用 <span class="chalk-green">cargo-zigbuild</span>（要求 PATH 上有 <span class="chalk-green">zig</span>）。子命令首次使用时自动安装。不能与另两个交叉标志或 <span class="chalk-green">--watch</span> 组合。                |
| useCross          | --use-cross           | boolean  | false |        | [实验性] <span class="chalk-warning">遗留方案，不推荐</span>：通过 <span class="chalk-green">cross</span>（cross-rs）在 Docker/Podman 容器内构建；优先使用 <span class="chalk-green">--use-napi-cross</span> 或 <span class="chalk-green">--cross-compile</span>。需要手动安装 <span class="chalk-green">cross</span> 并有运行中的容器引擎。不能与另两个交叉标志或 <span class="chalk-green">--watch</span> 组合。 |
| useNapiCross      | --use-napi-cross      | boolean  | false |        | [实验性] 从 npm 下载 gcc 交叉工具链（<span class="chalk-green">@napi-rs/cross-toolchain</span>）并设置 linker/CC 环境变量。仅限 Linux glibc 目标：x64、arm64、armv7、ppc64le、s390x（glibc 2.17），宿主机必须是 Linux x64/arm64。不支持的宿主机/目标以及安装失败都会报错。不能与另两个交叉标志组合。                                                                                                               |
| watch             | --watch,-w            | boolean  | false |        | 监听 crate 变更并通过 <span class="chalk-green">cargo-watch</span> crate 持续构建                                                                                                                                                                                                                                                                                                                                  |
| features          | --features,-F         | string[] | false |        | 以空格分隔的要启用的 feature 列表                                                                                                                                                                                                                                                                                                                                                                                  |
| allFeatures       | --all-features        | boolean  | false |        | 启用所有可用的 feature                                                                                                                                                                                                                                                                                                                                                                                             |
| noDefaultFeatures | --no-default-features | boolean  | false |        | 不启用 <span class="chalk-green">default</span> feature                                                                                                                                                                                                                                                                                                                                                            |

## 交叉编译标志

`napi build` 有三个交叉编译标志：`--use-napi-cross`、`--cross-compile`（`-x`）和 `--use-cross`。三者都是实验性的：行为可能在次要版本之间发生变化。

推荐的标志是：在 Linux x64/arm64 宿主机上构建 Linux glibc 目标用 `--use-napi-cross`，从非 Windows 宿主机构建 Windows MSVC 目标以及构建 musl 目标用 `--cross-compile`（`-x`）。当首选配置在你的宿主机上不可用时，`-x` 也是 glibc、macOS 和 FreeBSD 目标的兜底方案。Android、WASI 和 OpenHarmony 目标完全不需要交叉编译标志：CLI 会根据平台环境变量配置它们的工具链。`--use-cross` 是遗留方案，不推荐使用，基于 Docker 镜像的构建也已弃用。本页是各标志具体行为的参考。要为你的宿主机和目标选对标志，参见[交叉编译](../cross-build)。Alpine/musl 相关细节参见 [FAQ](../more/faq#%E4%B8%BA-linux-alpine-%E6%9E%84%E5%BB%BA)。

每个标志只改变构建的一件事：

| 标志                     | 改变什么                                   | 最终命令                                                                   |
| ------------------------ | ------------------------------------------ | -------------------------------------------------------------------------- |
| _（无）_                 | 什么都不变                                 | `cargo build --target <triple>`                                            |
| `--use-cross`            | 仅替换**二进制**                           | `cross build --target <triple>`                                            |
| `--cross-compile` / `-x` | 仅替换**子命令**（外加两个环境变量副作用） | `cargo zigbuild --target <triple>` 或 `cargo xwin build --target <triple>` |
| `--use-napi-cross`       | 仅设置**环境变量**（linker、CC、sysroot）  | 仍然是 `cargo build --target <triple>`                                     |

### 只能选择一个

::: warning
这些标志不能组合使用，只能选择一个。CLI 会在 Cargo metadata、工具链下载或 cargo
子命令安装之前拒绝任意两个交叉标志的组合。

:::

| 组合                                                            | 结果                                          |
| --------------------------------------------------------------- | --------------------------------------------- |
| `--use-cross`、`--use-napi-cross`、`--cross-compile` 中任意两个 | 在产生构建副作用前直接报错。                  |
| `--watch` + `--cross-compile`                                   | 直接报错；cargo-watch 只支持普通 Cargo 流程。 |
| `--watch` + `--use-cross`                                       | 直接报错；cargo-watch 只支持普通 Cargo 流程。 |

### 前置条件

| 标志                                    | 自动为你安装                                                                                                                                              | 你需要自备                                                                                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-x`，非 Windows 目标（cargo-zigbuild） | 首次使用时通过 `cargo install` 安装 <span class="chalk-green">cargo-zigbuild</span>（可能较慢）。                                                         | `PATH` 上的 `zig`。CLI 从不安装或检查 zig；缺少时 cargo-zigbuild 会报错。                                                                                                               |
| `-x`，Windows 目标（cargo-xwin）        | 首次使用时通过 `cargo install` 安装 <span class="chalk-green">cargo-xwin</span>。它会自行下载 Microsoft CRT 和 Windows SDK（受 Microsoft 许可条款约束）。 | `clang`（例如 `apt install clang` / `brew install llvm`）—— 这条路径**不**使用 zig。若依赖需要编译汇编，还需要 LLVM 工具（`rustup component add llvm-tools`）。CLI 对这些一概不做检查。 |
| `--use-cross`                           | 什么都不装。                                                                                                                                              | `cross` 二进制（缺失时报 `spawn cross ENOENT`），以及运行中的 Docker >= 20.10 或 Podman >= 3.4。                                                                                        |
| `--use-napi-cross`                      | gcc 工具链，自动从 npm 下载（<span class="chalk-green">@napi-rs/cross-toolchain</span>）并缓存在 `~/.napi-rs/cross-toolchain`。                           | `PATH` 上的 `npm`，以及 Linux x64 或 arm64 宿主机。CLI 会在构建副作用前验证宿主机和目标；下载、解压或设置失败会直接终止构建。                                                           |

### 示例

每个标志一条可复制粘贴的命令：

```sh
# Linux glibc targets, from a Linux x64/arm64 host
napi build --release --target aarch64-unknown-linux-gnu --use-napi-cross

# Windows MSVC from a macOS/Linux host, musl, or the zigbuild fallback cases
napi build --release --target x86_64-unknown-linux-musl --cross-compile

# Legacy container build (not recommended)
napi build --release --target x86_64-unknown-linux-gnu --use-cross
```

## `napi build` 实际运行了什么

`napi build` 是对一条派生命令加一组环境变量的封装。本节把两者都列出来。

### 命令

| 模式                                                       | 派生的命令                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| 不加交叉编译标志                                           | `cargo build --target <triple>`                                         |
| `--use-napi-cross`                                         | `cargo build --target <triple>`（只有环境变量变化）                     |
| `--use-cross`                                              | `cross build --target <triple>`（相同参数，相同的宿主机侧计算出的环境） |
| `--cross-compile`，目标是 Windows MSVC，宿主机不是 Windows | `cargo xwin build --target <triple>`（`i686` 会设置 `XWIN_ARCH=x86`）   |
| `--cross-compile`，其他任何目标                            | `cargo zigbuild --target <triple>`                                      |
| `--cross-compile`，目标是 Windows，宿主机是 Windows        | 打印警告，然后运行普通 `cargo build --target <triple>`                  |

`--cross-compile` 按目标的**平台**选择 cargo-xwin，但从非 Windows 宿主机只接受 Windows MSVC 目标。Windows GNU 和 gnullvm 目标会在产生构建副作用前被拒绝，因为 cargo-xwin 无法提供它们的工具链。请不加 `-x`，分别使用 mingw-w64 或 llvm-mingw 构建；参见[各目标的构建方法](../cross-build#%E5%90%84%E7%9B%AE%E6%A0%87%E7%9A%84%E6%9E%84%E5%BB%BA%E6%96%B9%E6%B3%95)中的 windows-gnu 说明。每个非 Windows 目标都走 cargo-zigbuild；CLI 不维护 zigbuild 支持目标的列表，即使目标与宿主机相同也照样使用。

如果设置了 `CARGO` 环境变量，CLI 会在所有模式下改为派生该二进制。与 `--use-cross` 或 `--cross-compile` 一起使用时，CLI 会警告该覆盖会替换所选机制依赖的二进制。

### RUSTFLAGS

- 任何 `*musl*` 目标：CLI 向 `RUSTFLAGS` 追加 `-C target-feature=-crt-static`。
- `--strip`：CLI 追加 `-C link-arg=-s`。

两者都通过导出的 `RUSTFLAGS` 环境变量生效。Cargo 中环境变量的优先级高于 `.cargo/config.toml` 里的 `rustflags`，因此一旦 CLI 导出了它，你 `.cargo/config.toml` 中的 rustflags 就会被忽略。如果需要额外的标志，请把它们加到 `RUSTFLAGS` 环境变量里，而不是 `.cargo/config.toml`。

### C 编译器

同时设置 `TARGET_CC` 和 `CC` 时，`TARGET_CC` 生效（自 `@napi-rs/cli` 3.0.0-alpha.92 起）。

### 不常见目标的默认链接器

在不使用 `--cross-compile` 时，下列目标的 `CARGO_TARGET_<T>_LINKER` 会被指向一个**需要你自行安装**的交叉 gcc。CLI 只设置环境变量而不做检查：如果该二进制缺失，构建会在链接阶段失败。你自己设置的 `CARGO_TARGET_<T>_LINKER` 环境变量始终优先。使用 `--cross-compile` 时会跳过这张表 —— 链接交给 zig 或 xwin。

| 目标                            | CLI 设置的链接器               |
| ------------------------------- | ------------------------------ |
| `aarch64-unknown-linux-musl`    | `aarch64-linux-musl-gcc`       |
| `loongarch64-unknown-linux-gnu` | `loongarch64-linux-gnu-gcc-13` |
| `riscv64gc-unknown-linux-gnu`   | `riscv64-linux-gnu-gcc`        |
| `powerpc64le-unknown-linux-gnu` | `powerpc64le-linux-gnu-gcc`    |
| `s390x-unknown-linux-gnu`       | `s390x-linux-gnu-gcc`          |

### Android、WASI 和 OpenHarmony

只要目标平台匹配，这些目标就会从 CLI 获得工具链环境变量 —— 无论是否传入任何交叉编译标志 —— 但每个平台有自己的条件：

- **Android**：在非 Android 宿主机上，linker/CC/AR 环境变量由 `ANDROID_NDK_LATEST_HOME` 构造。如果该变量缺失，CLI 会在启动 Cargo 前停止，而不是导出无效的工具路径。当宿主机本身就是 Android 时，整套设置（包括对该变量的要求）都会被跳过。
- **WASI**：`EMNAPI_LINK_DIR` 始终被设置为自带的 emnapi（当 `emnapi`、`@emnapi/core` 和 `@emnapi/runtime` 的版本不匹配时 CLI 会报错）。只有当设置了 `WASI_SDK_PATH` **且**该目录存在时，才会设置 wasi-sdk 的 linker/CC 环境变量 —— 否则链接回退到 cargo 的默认值，即 rustup 自带的 `rust-lld`。
- **OpenHarmony**：环境变量由 `$OHOS_SDK_PATH/native` 构造，当 `OHOS_SDK_PATH` 未设置时改用 `OHOS_SDK_NATIVE`。两者都未设置时，CLI 打印警告且什么都不设置。

## 向 Cargo 传递标志

`--` 之后的标志会透传给 cargo build 命令。例如：

```sh
napi build -- --locked
```

这会把 `--locked` 标志传给 `cargo build`，最终执行 `cargo build --locked`。

## 构建 Cargo 可执行文件

`--bin <name>` 会选择一个 Cargo 二进制目标，包括同时包含 `cdylib` 的包。CLI 会把 `--bin <name>` 传给 Cargo，并使用普通名称（Windows 上带 `.exe`）把生成的可执行文件复制到 `--output-dir`：

**Cargo.toml**

```toml
[[bin]]
name = "my-tool"
path = "src/main.rs"
```

```sh
napi build --bin my-tool --release --output-dir dist
./dist/my-tool
```

该模式不会生成 `.node` 插件、JavaScript 加载器或 TypeScript 声明；构建后的绑定生成只对 `cdylib` 运行。

未传入 `--bin` 时，包中的 `cdylib` 仍是首选插件目标。在 workspace 中，如果二进制目标不在 `--manifest-path` 默认选择的包内，请组合使用 `--package <cargo-package>` 和 `--bin <name>`。

## 关于 `--js-package-name` 的说明

在[深入](../introduction/getting-started#deep-dive)一节中，我们建议你把包发布在 [`npm scope`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) 下。但如果你正在迁移一个不在 [`npm scope`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) 下的既有包，或者你就是不想把包放在 [`npm scope`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) 下，那么在发布各平台原生包时可能会触发 [_npm spam detection_](https://stackoverflow.com/questions/48668389/npm-publish-failed-with-package-name-triggered-spam-detection/54135900#54135900)，比如 `snappy-darwin-x64`、`snappy-darwin-arm64` 等等……

这种情况下，你可以把平台包发布到 [`npm scope`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) 下来避免 [_npm spam detection_](https://stackoverflow.com/questions/48668389/npm-publish-failed-with-package-name-triggered-spam-detection/54135900#54135900)。你的用户也无需关心 `optionalDependencies` 里的平台原生包。以 [`snappy`](https://github.com/Brooooooklyn/snappy/) 为例，用户只需通过 `yarn add snappy` 安装它，而平台原生包都在 `@napi-rs` scope 下：

```json
{
  "name": "snappy",
  "version": "7.0.0",
  "optionalDependencies": {
    "@napi-rs/snappy-win32-x64-msvc": "7.0.0",
    "@napi-rs/snappy-darwin-x64": "7.0.0",
    "@napi-rs/snappy-linux-x64-gnu": "7.0.0",
    "@napi-rs/snappy-linux-x64-musl": "7.0.0",
    "@napi-rs/snappy-linux-arm64-gnu": "7.0.0",
    "@napi-rs/snappy-win32-ia32-msvc": "7.0.0",
    "@napi-rs/snappy-linux-arm-gnueabihf": "7.0.0",
    "@napi-rs/snappy-darwin-arm64": "7.0.0",
    "@napi-rs/snappy-android-arm64": "7.0.0",
    "@napi-rs/snappy-android-arm-eabi": "7.0.0",
    "@napi-rs/snappy-freebsd-x64": "7.0.0",
    "@napi-rs/snappy-linux-arm64-musl": "7.0.0",
    "@napi-rs/snappy-win32-arm64-msvc": "7.0.0"
  }
}
```

针对这种情况，`@napi-rs/cli` 提供了 `--js-package-name` 来覆盖生成的包加载逻辑。例如在 `snappy` 中，我们的 <span class="chalk-green">package.json</span> 是这样的：

```json
{
  "name": "snappy",
  "version": "7.0.0",
  "napi": {
    "binaryName": "snappy"
  }
}
```

不使用 `--js-package-name` 标志时，`@napi-rs/cli` 会生成这样的 JavaScript 绑定来为你加载平台原生包：

**index.js**

```js {10,22}
switch (platform) {
  case 'darwin':
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(join(__dirname, 'snappy.darwin-x64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./snappy.darwin-x64.node')
          } else {
            nativeBinding = require('snappy-darwin-x64')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm64':
        localFileExisted = existsSync(join(__dirname, 'snappy.darwin-arm64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./snappy.darwin-arm64.node')
          } else {
            nativeBinding = require('snappy-darwin-arm64')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on macOS: ${arch}`)
    }
    break
    ...
}
```

这不是我们想要的。所以用 `--js-package-name` 覆盖生成的 JavaScript 绑定文件中的 `package name`：`napi build --release --platform --js-package-name @napi-rs/snappy`。生成的 JavaScript 文件就会变成：

**index.js**

```js {10,22}
switch (platform) {
  case 'darwin':
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(join(__dirname, 'snappy.darwin-x64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./snappy.darwin-x64.node')
          } else {
            nativeBinding = require('@napi-rs/snappy-darwin-x64')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm64':
        localFileExisted = existsSync(join(__dirname, 'snappy.darwin-arm64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./snappy.darwin-arm64.node')
          } else {
            nativeBinding = require('@napi-rs/snappy-darwin-arm64')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on macOS: ${arch}`)
    }
    break
    ...
}
```
