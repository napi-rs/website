---
title: '快速开始'
description: 创建、构建并测试一个 napi-rs v3 包。
---

# 快速开始

创建 napi-rs v3 包最快的方式是使用 `napi new`。它会复制持续维护的包模板，应用你的包名与目标平台选择，并可选地创建 GitHub Actions 工作流。

<video controls style="width: 100%"><source src="/assets/napi-rs-guide.mp4" type="video/mp4" /></video>

## 前置条件

- 当前 `@napi-rs/cli` 工具链**推荐在 Node 22 系列使用 Node.js 22.13 或更高版本，或者使用 Node.js 24+**。CLI 声明 `>=23.5.0 || ^22.13.0 || ^20.17.0`，与其交互式提示依赖一致。该构建期要求与生成插件的运行时要求彼此独立。参见[支持与兼容性](/docs/more/support-compatibility#cli-与-rust-要求)。
- **Rust 1.88 或更高版本**，包括 Cargo。推荐通过 [rustup](https://rustup.rs/) 安装 Rust。
- **Git**，因为 `napi new` 会通过 Git 下载并更新模板。
- 开发平台上可用的链接器：macOS 使用 Xcode Command Line Tools，Windows 使用 MSVC Build Tools，Linux 使用常见的 C 构建工具。

Node-API 让原生二进制文件与之后提供相同或更高 Node-API 级别的 Node.js 版本保持 ABI 兼容。这与 napi-rs CI 实际覆盖的 Node.js 版本和目标三元组并不是一回事。选择运行时或发布矩阵前，请阅读[支持与兼容性](/docs/more/support-compatibility)。

## 创建项目

无需全局安装 CLI。直接使用你偏好的包运行器执行：

```sh
# Yarn template (the default)
npx @napi-rs/cli new cool

# The same template through Yarn
yarn dlx @napi-rs/cli new cool

# pnpm template
pnpm dlx @napi-rs/cli new cool --package-manager pnpm
```

该命令默认以交互方式运行，会询问：

1. 写入 `package.json` 的包名。
2. 用于生成 Cargo feature 和包 Node.js 引擎要求的最低 Node-API 级别。
3. 从所选模板中保留的目标三元组。
4. 许可证。
5. 是否生成 TypeScript 声明。
6. 是否保留模板中的 GitHub Actions 工作流。

目前仅支持持续维护的 **Yarn** 和 **pnpm** 模板。模板会固定自身使用的包管理器版本，因此项目创建后请使用对应命令。如果希望无提示创建项目，请传入所有需要修改的值并添加 `--no-interactive`；参见 [`napi new`](/docs/cli/new)。

## 安装、构建与测试

对于默认的 Yarn 模板：

```sh
cd cool
yarn install
yarn build
yarn test
```

对于 pnpm 模板：

```sh
cd cool
pnpm install
pnpm build
pnpm test
```

本地构建只编译一个原生目标：默认是当前主机，除非传入 `--target`。构建会生成：

- `<binaryName>.<platform-arch-abi>.node`：原生插件。
- `index.js`：生成的加载器。
- `index.d.ts`：启用类型生成时创建的 TypeScript 声明。

生成项目中的重要源文件包括：

| 路径                       | 用途                                        |
| -------------------------- | ------------------------------------------- |
| `src/lib.rs`               | 通过 `#[napi]` 导出的 Rust 函数、结构体和类 |
| `Cargo.toml`               | Rust crate 元数据和 napi-rs 依赖            |
| `build.rs`                 | 必需的 napi-rs 构建设置                     |
| `package.json`             | JavaScript 脚本、包元数据和 `napi` 配置     |
| `.github/workflows/CI.yml` | 多目标构建、测试、产物与发布工作流          |

模板不会提交 `npm/`。各平台构建完成后，发布任务会通过 `napi create-npm-dirs` 创建各目标包目录。

继续阅读[一个简单的包](./simple-package)，修改 Rust API 并从 Node.js 调用它。

## 深入了解 {#deep-dive}

### 生成的包如何分发

napi-rs 通常发布一个很小的根包，并为每个平台分别发布一个可选包。例如，`@cool/core` 可能依赖：

**package.json**

```json
{
  "optionalDependencies": {
    "@cool/core-darwin-x64": "1.0.0",
    "@cool/core-win32-x64-msvc": "1.0.0",
    "@cool/core-linux-arm64-gnu": "1.0.0"
  }
}
```

生成的 `index.js` 首先查找开发期间生成的本地插件。对于已安装的包，它会根据当前操作系统、CPU 和 Linux libc 加载对应的可选包。包管理器会利用平台包的 `os`、`cpu` 以及适用时的 `libc` 字段，避免安装不兼容的二进制文件。

推荐使用 [npm scope](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)，因为每个受支持目标都需要一个不同的包名。

`napi.targets` 数组描述项目要打包哪些目标；它**不会**让一次 `napi build` 调用编译所有目标。脚手架只能保留其模板中已有的构建任务。若要添加其他可接受目标，需要显式添加配置项、npm 目录和 CI 构建。参见[支持与兼容性](/docs/more/support-compatibility)和[交叉编译](/docs/cross-build)。

## 直接从模板开始

![package-template](/assets/package-template.png)

如果更喜欢 GitHub 的 **Use this template** 流程，请选择对应项目：

- [Yarn 包模板](https://github.com/napi-rs/package-template)
- [pnpm 包模板](https://github.com/napi-rs/package-template-pnpm)

克隆后，安装依赖，并在以自己的包名发布之前，通过所选包管理器运行 `napi rename`。

## 后续阅读

- [`napi new`](/docs/cli/new)：查看所有脚手架选项。
- [构建](/docs/cli/build)和[交叉编译](/docs/cross-build)：了解其他目标。
- [发布原生包](/docs/deep-dive/release)：在向 npm 发布任何内容前阅读。
