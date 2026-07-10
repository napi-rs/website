---
title: '发布原生包'
description: 构建、验证、发布多平台 napi-rs 版本，并从部分失败中恢复。
---

# 发布原生包

napi-rs 以 npm 包形式分发预构建插件。使用者安装一个很小的根包，包管理器会根据当前操作系统、CPU 和 libc 选择匹配的可选包。使用者的机器无需编译器或安装时下载脚本。

::: warning
多平台发布不是原子操作。npm 版本不可变，而故障可能发生在部分平台包已经存在、根包尚未发布之间。请把发布任务视为生产变更，而不是构建预览。

:::

## 分发模型

对于 `@scope/addon` 这样的根包，napi-rs 会创建：

```text
@scope/addon
@scope/addon-darwin-arm64
@scope/addon-win32-x64-msvc
@scope/addon-linux-x64-gnu
@scope/addon-linux-x64-musl
```

每个平台包包含一个原生产物，并声明 npm `os`、`cpu` 以及适用时的 `libc` 限制。根包在 `optionalDependencies` 中列出这些包的精确版本；其生成的加载器随后加载与运行系统匹配的包。

该模型避免了两种常见替代方案：

- 分发 Rust/C/C++ 源码，并要求每个使用者安装原生工具链。
- 在 `postinstall` 中从 GitHub 或 CDN 下载二进制文件，这会带来安装时网络和私有网络故障。

## 发布流水线中的命令

| 命令                                             | 职责                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| [`napi create-npm-dirs`](../cli/create-npm-dirs) | 为每个已配置目标创建包目录。                                                    |
| [`napi build`](../cli/build)                     | 每次调用构建一个目标。CI 为每个矩阵任务运行一次。                               |
| [`napi artifacts`](../cli/artifacts)             | 将下载的 `.node`/`.wasm` 文件收集到根包与平台包。                               |
| [`napi pre-publish`](../cli/pre-publish)         | 同步版本和可选依赖，发布平台包，并可选地创建/上传 GitHub release。              |
| `npm publish`                                    | 发布根包。在模板中，它会先通过 `prepublishOnly` 调用 `napi prepublish -t npm`。 |

`napi pre-publish` 不会构建或收集产物，也不会自行发布根包。

## 一次性发布设置

首次发布前：

1. 使用 npm scope，或确认根包名及所有带目标后缀的包名都可用。
2. 在 `package.json` 中设置最终的 `name`、`repository`、`license` 和 `publishConfig`。为了 npm provenance，repository 必须与 GitHub 工作流匹配。
3. 检查 `napi.binaryName` 和 `napi.targets`。每个目标都需要包、构建任务和运行时测试；仅仅是可接受的 target triple 并不构成支持保证。
4. 将 npm automation token 配置为 `NPM_TOKEN` Actions secret；除非你有意用 npm trusted publishing 替换模板。该身份必须有权发布根包和所有平台包名。
5. 在发布任务中保留用于创建 GitHub release 的 `contents: write`，以及用于 npm provenance 的 `id-token: write`。
6. 启用发布前，先让普通分支/PR 工作流成功运行。

扩展生成的矩阵前，请阅读[支持与兼容性](/docs/more/support-compatibility)和[交叉编译](../cross-build)。

## 每个版本的发布前检查

创建版本提交前，请确认：

- 发布提交来自预期的干净分支，且源代码已完成审核。
- 本地格式化、Rust 检查、JavaScript 测试、生成声明和本地原生加载全部通过。
- CI 矩阵构建 `napi.targets` 中的每一项，而且每个生成文件都具有预期的 `binaryName.platform-arch-abi` 后缀。
- 新的根包和平台包版本在 npm 上都不存在。
- `npm whoami` 对发布身份执行成功，且 token 对所有包名都有效。
- changelog 与 Node-API/运行时支持声明符合本次发布。

在不运行生命周期脚本的情况下检查根 tarball：

```sh
npm pack --dry-run --ignore-scripts
```

不要依赖 `npm publish --dry-run`：npm 生命周期脚本仍可能调用 `napi prepublish`，从而真正发布平台包。请单独使用 [`napi pre-publish --dry-run`](../cli/pre-publish#安全预览)，同时注意它不会验证产物完整性或 registry 授权。

## 使用生成的工作流发布

持续维护的模板从 GitHub Actions 工作流发布。该任务会：

1. 等待 lint、构建和运行时测试任务。
2. 使用 `actions/download-artifact@v8` 下载所有工作流产物。
3. 创建目标 npm 目录。
4. 运行 `napi artifacts` 填充根包与平台包。
5. 启用 npm provenance。
6. 对根包运行 `npm publish`。它的 `prepublishOnly` 脚本运行 `napi prepublish -t npm`，先发布平台包并上传 GitHub release 产物。
7. 使用默认 npm tag 发布稳定版本，或使用 `next` tag 发布预发布版本。

当前模板根据最新提交消息决定是否发布。`npm version` 默认就会把裸版本号写入提交消息（其 `message` 配置默认值为 `%s`）；只有 Git tag 会带上 `v` 前缀（`tag-version-prefix` 默认为 `v`），而模板的发布关卡对 `1.2.3` 和 `v1.2.3` 都接受。因此仅 `npm version patch` 本身产生的提交消息就能匹配该关卡——下面传入 `-m "%s"` 是可选的，只是固定提交消息格式：

```sh
# Creates the version commit and v-prefixed Git tag, but makes the commit
# message itself exactly the new version (for example, 1.2.3).
npm version patch -m "%s"
git push --follow-tags
```

预发布版本：

```sh
npm version prerelease --preid next -m "%s"
git push --follow-tags
```

使用这些命令前，请检查生成的 `.github/workflows/CI.yml`。如果项目已经更改触发器或发布工具，应遵循签入仓库的工作流，而不是模板约定。

## CI 中的发布关卡

由于预期目标文件缺失时 CLI 只会警告并继续，请在发布步骤之前添加明确关卡，证明：

- 每个已配置目标目录都存在。
- 每个目录包含且只包含预期的 `.node` 或 `.wasm` 文件。
- WASI 包包含生成的加载器和 worker 支持文件。
- 没有产物使用意外的二进制名称或目标后缀。
- 平台运行时测试使用的正是即将发布的产物。

除非所有平台关卡都通过，否则不要发布根包。根版本一旦存在，客户端可能立即尝试解析每个列出的可选依赖。

## 验证已发布版本

工作流显示绿色并不足够。发布后：

1. 用 `npm view @scope/addon@<version> --json` 读取根包元数据，确认 dist-tag 和精确 `optionalDependencies`。
2. 查询同一版本的每个平台包，检查其 `os`、`cpu`、`libc` 和 tarball 文件列表。
3. 工作流承诺 provenance 时，确认 npm 显示该信息。
4. 确认 GitHub release 指向预期 tag，并包含所有预期二进制产物。
5. 在有代表性的 glibc、musl、macOS 和 Windows 系统上将根包安装到干净项目，并调用一个原生导出。
6. 发布包含 WASI 时，单独测试原生到 WASI 的回退。

将发布工作流 URL 和验证结果保存在 release notes 中。

## 从部分发布中恢复

不要立即提升版本或重新构建。先盘点失败版本的 npm 平台包、根包和 GitHub 产物。已发布二进制文件绝不能在同一版本下被不同内容替换。

恢复工具包括：

- 使用未更改的产物重新运行 `napi prepublish -t npm`，发布缺失的平台包。npm 返回标准重复版本错误时，已发布版本会被跳过。
- 传入 `--gh-release-id <id>`，上传到现有 release，而不是另建一个。
- 只有在独立确认每个平台包都已存在后才传入 `--skip-optional-publish`。
- 如果只剩根包未发布，请在可信发布任务中禁用生命周期脚本并发布未更改的根 tarball，避免重复平台阶段。

请遵循详细的[部分失败与恢复流程](../cli/pre-publish#部分失败与恢复)。如果根包在缺失某个平台依赖时已经发布，请立即发布缺失包，或弃用损坏的根版本；npm 没有原子回滚。
