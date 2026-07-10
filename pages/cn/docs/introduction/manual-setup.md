---
title: '手动设置'
description: 不使用模板，将 NAPI-RS 添加到现有 Rust crate、JavaScript 包或工作区。
---

# 手动设置

如果你已有 Rust crate 或 JavaScript 包、需要最小化项目，或希望将 Rust 与 JavaScript 包放在 monorepo 的不同位置，请使用本指南。如果要创建一个独立包并需要完整发布工作流，[`napi new`](/docs/cli/new) 通常更快捷。

CLI 是构建与打包工具。你的插件仍是普通 Cargo crate，因此可以继续使用现有的工作区布局和包管理器。

## 前置条件

安装当前 Rust 工具链、适用于当前 CLI 的 Node.js 22.13+（或 Node.js 24+），并在拥有该插件的 JavaScript 包中安装 NAPI-RS CLI：

```sh
rustc --version
node --version
npm install --save-dev @napi-rs/cli@^3
```

将 CLI 保持为本地依赖，可确保本地构建和 CI 使用项目记录的版本。通过包脚本或 `npx napi` 运行即可，无需全局安装。

## 最小项目

最小的实用布局如下：

```text
my-addon/
├── Cargo.toml
├── build.rs
├── package.json
├── src/
│   └── lib.rs
└── test.cjs
```

### 配置 Cargo

库必须是 `cdylib`：Node 会加载生成的共享库，而不是将其链接到另一个 Rust 可执行文件。`napi-build` 会为宿主平台配置输出，`napi-derive` 的默认 feature 会启用严格宏验证和 TypeScript 定义生成。

**Cargo.toml**

```toml
[package]
name = "my-addon-native"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
napi = "3"
napi-derive = "3"

[build-dependencies]
napi-build = "2"
```

创建构建脚本：

**build.rs**

```rust
fn main() {
  napi_build::setup();
}
```

### 导出 Rust 函数

**src/lib.rs**

```rust
use napi_derive::napi;

#[napi]
pub fn add(left: i32, right: i32) -> i32 {
  left + right
}
```

### 配置 JavaScript 包

`binaryName` 控制生成的文件名。`--platform` 会添加当前平台后缀，并生成加载器，用于选择本地二进制文件或对应的可选平台包。

**package.json**

```json
{
  "name": "my-addon",
  "version": "0.1.0",
  "main": "index.js",
  "types": "index.d.ts",
  "scripts": {
    "build": "napi build --platform",
    "build:release": "napi build --platform --release",
    "test": "node --test test.cjs"
  },
  "napi": {
    "binaryName": "my-addon"
  },
  "devDependencies": {
    "@napi-rs/cli": "^3"
  }
}
```

构建并调用插件：

**test.cjs**

```js
const assert = require('node:assert/strict')
const test = require('node:test')

const { add } = require('./index.js')

test('adds two numbers', () => {
  assert.equal(add(2, 3), 5)
})
```

```sh
npm run build
npm test
```

默认情况下，调试构建会在 crate 目录生成：

```text
index.d.ts
index.js
my-addon.<platform-arch-abi>.node
```

`.node` 文件是原生库。请导入 `index.js`，不要硬编码平台文件：生成的加载器还会处理 libc 选择、单独发布的平台包和可选 WASI 回退。

::: info
不使用 `--platform` 时，CLI 会复制一个 `my-addon.node` 文件，但不会生成 JavaScript 加载器。这适合底层实验；发布的包通常应使用 `--platform`。

:::

## 常见变体

### 异步函数

如果导出的 Rust `async fn` 应转换为 JavaScript `Promise`，请启用 `async` feature：

**Cargo.toml**

```toml
[dependencies]
napi = { version = "3", features = ["async"] }
napi-derive = "3"
tokio = { version = "1", features = ["fs"] }
```

选择 Tokio、`AsyncTask`、ThreadsafeFunction 或 stream 前，请阅读[异步与并发](/docs/more/async-concurrency)。

### 自定义输出目录

所有路径都相对于 `--cwd`。可通过以下命令将生成的 JavaScript、TypeScript 和原生文件放入 JavaScript 包：

```sh
napi build --platform --output-dir ./dist
```

请将加载器与其本地 `.node` 文件放在一起。只移动 `index.js` 会破坏相对路径查找。

### 单独的配置文件

默认情况下，CLI 读取 `package.json` 中的 `napi` 对象。可以把该对象移到 JSON 文件并传入 `--config-path`；若两者同时存在，则以单独文件为准。

**napi.config.json**

```json
{
  "binaryName": "my-addon",
  "packageName": "@scope/my-addon",
  "targets": [
    "x86_64-unknown-linux-gnu",
    "aarch64-apple-darwin",
    "x86_64-pc-windows-msvc"
  ]
}
```

```sh
napi build --platform --config-path napi.config.json
```

`targets` 描述你准备打包的产物。本地构建仍然一次只构建一个目标；请在 CI 中显式传入 `--target <rust-triple>`。

## Cargo 和 JavaScript 工作区

Rust crate 与 JavaScript 包不必位于同一目录。例如：

```text
workspace/
├── Cargo.toml                 # [workspace] members = ["crates/native"]
├── crates/
│   └── native/
│       ├── Cargo.toml         # package.name = "my-addon-native"
│       ├── build.rs
│       └── src/lib.rs
└── packages/
    └── addon/
        └── package.json       # owns the napi config and generated output
```

从工作区根目录运行 CLI，并显式指定所有路径：

```sh
napi build \
  --cwd packages/addon \
  --manifest-path ../../Cargo.toml \
  --package my-addon-native \
  --package-json-path package.json \
  --output-dir . \
  --platform
```

关键区别如下：

| 选项                  | 选择内容                                            |
| --------------------- | --------------------------------------------------- |
| `--cwd`               | 其他所有相对路径的基准目录                          |
| `--manifest-path`     | `cargo metadata` 使用的 crate 或工作区 `Cargo.toml` |
| `--package`           | 工作区内要构建的确切 Cargo 包名                     |
| `--package-json-path` | JavaScript 包和 NAPI-RS 配置                        |
| `--output-dir`        | `.node`、加载器和 `.d.ts` 文件的目标位置            |

如果 manifest 指向虚拟 Cargo 工作区，则必须提供 `--package`，否则 CLI 无法判断哪个 `cdylib` 成员拥有该插件。

## 为分发做准备

对于单台本地机器，生成的加载器和 `.node` 文件已经足够。发布跨平台包时，通常会为每个目标使用单独的可选 npm 包：

1. 将所有 target triples 添加到 `napi.targets`。
2. 每个 CI 任务构建一个 `--platform --release --target <triple>` 产物。
3. 运行 [`napi create-npm-dirs`](/docs/cli/create-npm-dirs)。
4. 下载 CI 产物并运行 [`napi artifacts`](/docs/cli/artifacts)。
5. 遵循[发布指南](/docs/deep-dive/release)，并在发布前阅读 [`napi pre-publish`](/docs/cli/pre-publish) 的所有副作用。

不要把开发机器上构建的二进制文件当作支持其他操作系统的产物发布。请使用[交叉编译指南](/docs/cross-build)，并在你声称支持的每个运行时上测试最终包。

## 后续阅读

- [测试与调试](/docs/more/testing-debugging)
- [与应用和打包器集成](/docs/more/integrations)
- [故障排除](/docs/more/troubleshooting)
- [NAPI-RS 配置](/docs/cli/napi-config)
