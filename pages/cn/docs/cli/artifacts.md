---
title: 'Artifacts'
description: 将 CI 构建产物收集到 napi-rs 平台包中。
---

# Artifacts

`napi artifacts` 会递归查找已构建的 `.node` 和 `.wasm` 文件，验证其二进制名称和目标后缀，再把它们复制到对应的各平台 npm 包。原生文件也会复制到根包目录，使生成的加载器能够解析本地绑定。

## 用法

```sh
napi artifacts [--options]
```

```ts
import { NapiCli } from '@napi-rs/cli'

await new NapiCli().artifacts({
  outputDir: 'artifacts',
  npmDir: 'npm',
})
```

## 选项

| 选项              | CLI 语法              | 类型     | 必填 | 默认值                                          | 描述                                                                              |
| ----------------- | --------------------- | -------- | :--: | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `cwd`             | `--cwd`               | `string` |  否  | `process.cwd()`                                 | 配置、包、下载产物、npm 包和构建输出路径的基准目录。                              |
| `configPath`      | `--config-path,-c`    | `string` |  否  |                                                 | 独立 napi 配置 JSON 文件。                                                        |
| `packageJsonPath` | `--package-json-path` | `string` |  否  | <span class="chalk-green">`package.json`</span> | 包含 napi 配置的根包。                                                            |
| `outputDir`       | `--output-dir,-o,-d`  | `string` |  否  | <span class="chalk-green">`./artifacts`</span>  | 递归搜索所下载 `.node` 和 `.wasm` 文件的目录。它对应产物下载路径，而不是 `npm/`。 |
| `npmDir`          | `--npm-dir`           | `string` |  否  | <span class="chalk-green">`npm`</span>          | 包含生成的各平台包的目录。                                                        |
| `buildOutputDir`  | `--build-output-dir`  | `string` |  否  | `cwd`                                           | 包含生成的 WASI JavaScript 和 worker 文件的目录。相对路径从 `--cwd` 解析。        |

不存在 `--dist` 选项。下载的构建产物使用 `--output-dir`，平台包目标位置使用 `--npm-dir`。

## CI 工作流

每个构建任务都应上传以配置的二进制名称和目标 ABI 命名的文件，例如：

```text
cool.darwin-arm64.node
cool.linux-x64-gnu.node
cool.win32-x64-msvc.node
cool.wasm32-wasi.wasm
```

在收集任务中，创建包目录、下载所有产物，然后收集它们：

```yaml
- name: Create platform packages
  run: yarn napi create-npm-dirs

- name: Download all build artifacts
  uses: actions/download-artifact@v8
  with:
    path: artifacts

- name: Move artifacts into packages
  run: yarn napi artifacts --output-dir artifacts --npm-dir npm
```

`actions/download-artifact` 通常会为每个上传产物创建一个嵌套目录。CLI 会递归搜索，因此以下两种布局都能使用：

```text
artifacts/
├── bindings-aarch64-apple-darwin/
│   └── cool.darwin-arm64.node
├── bindings-x86_64-unknown-linux-gnu/
│   └── cool.linux-x64-gnu.node
└── bindings-x86_64-pc-windows-msvc/
    └── cool.win32-x64-msvc.node
```

收集之后：

```text
.
├── cool.darwin-arm64.node
├── cool.linux-x64-gnu.node
├── cool.win32-x64-msvc.node
└── npm/
    ├── darwin-arm64/cool.darwin-arm64.node
    ├── linux-x64-gnu/cool.linux-x64-gnu.node
    └── win32-x64-msvc/cool.win32-x64-msvc.node
```

## 匹配规则

对于找到的每个文件，CLI 会：

1. 从文件名中拆出最后一个以点分隔的后缀，例如 `linux-x64-gnu`。
2. 要求其余基本名称等于 `napi.binaryName`。二进制名称不匹配时会发出警告并跳过。
3. 找到目录与该平台后缀匹配的已配置目标包。若某文件没有对应目标包，命令会失败；但有意合并为已配置通用二进制文件的源二进制除外。
4. 将文件写入该目标包和根包目录。

::: warning
该命令信任文件名中的后缀。它不会检查原生二进制文件来确认其架构、libc、最低操作系统版本或 Node-API 级别。发布前，请在产物声称支持的每个运行时上测试。

:::

## WASI 产物

当 `napi.targets` 包含 WASI 目标时，`napi artifacts` 还会把生成的支持文件复制到 `npm/wasm32-wasi`：

- `<binaryName>.wasi.cjs`
- `<binaryName>.wasi-browser.js`
- `wasi-worker.mjs`
- `wasi-worker-browser.mjs`

默认从 `--cwd` 读取这些文件。如果 WASI 构建将它们写到其他位置，请传入 `--build-output-dir`；相对值从 `--cwd` 解析。下载的 `.wasm` 文件仍在 `--output-dir` 下查找。

收集并验证所有目标后，[`napi pre-publish`](./pre-publish) 会设置版本并发布平台包。`napi pre-publish` 不会替你复制缺失的产物。
