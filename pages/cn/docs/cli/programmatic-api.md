---
title: '程序化 API'
description: 使用 @napi-rs/cli 程序化 API 自定义构建工作流。
---

# 程序化 API

`@napi-rs/cli` 包导出了一组程序化 API，可以在 CLI 命令所提供的能力之外自定义构建工作流。它适用于：

- 对构建输出进行后处理（格式化、转换或验证生成的文件）
- 与 Bazel 等自定义构建系统集成
- 独立于 Rust 编译生成 TypeScript 定义
- 编写可完整控制构建过程的自动化脚本

## 后处理构建输出

最常见的用法是对生成的 JavaScript 和 TypeScript 文件执行自定义后处理。以下示例使用 <span class="chalk-green">oxfmt</span> 格式化输出文件：

**build.ts**

```ts
import { readFile, writeFile } from 'node:fs/promises'

import { NapiCli, createBuildCommand } from '@napi-rs/cli'
import { format, type FormatOptions } from 'oxfmt'

import oxfmtConfig from './.oxfmtrc.json' with { type: 'json' }

const buildCommand = createBuildCommand(process.argv.slice(2))
const cli = new NapiCli()
const buildOptions = {
  ...buildCommand.getOptions(),
  cargoOptions: buildCommand.cargoOptions,
}
const { task } = await cli.build(buildOptions)
const outputs = await task

for (const output of outputs) {
  if (output.kind === 'js' || output.kind === 'dts') {
    const { code } = await format(
      output.path,
      await readFile(output.path, 'utf-8'),
      oxfmtConfig as FormatOptions,
    )
    await writeFile(output.path, code)
  }
}
```

使用与传给 <span class="chalk-green">napi build</span> 相同的参数运行该脚本，包括 `--` 后面的 Cargo 参数：

```sh
oxnode ./build.ts --release --platform
```

### 工作原理

1. `createBuildCommand(args)` 解析 CLI 参数并返回 `BuildCommand` 实例
2. `buildCommand.getOptions()` 提取具名选项；`cargoOptions` 携带 `--` 后面的尾随参数
3. `cli.build(options)` 启动构建并返回 `{ task, abort }`
4. `await task` 等待构建完成，并返回 `Output` 对象数组

### 输出类型

输出数组中的每一项都具有以下结构：

```ts
type OutputKind = 'js' | 'dts' | 'node' | 'exe' | 'wasm'

type Output = {
  kind: OutputKind
  path: string // Absolute path to the output file
}
```

| Kind                                  | 描述                                                             |
| ------------------------------------- | ---------------------------------------------------------------- |
| <span class="chalk-green">node</span> | 原生 Node.js 插件（<span class="chalk-green">.node</span> 文件） |
| <span class="chalk-green">js</span>   | JavaScript 绑定文件                                              |
| <span class="chalk-green">dts</span>  | TypeScript 定义文件                                              |
| <span class="chalk-green">exe</span>  | 可执行二进制文件                                                 |
| <span class="chalk-green">wasm</span> | WebAssembly 模块                                                 |

## 独立生成类型/JS

::: info
这适合由 Bazel 等构建系统单独处理 Rust 编译、只需执行 TypeScript 类型生成步骤的场景。

:::

如果在 `@napi-rs/cli` 之外编译 Rust 代码（例如使用 Bazel 的 `rust_shared_library`），仍可使用 `generateTypeDef` 和 `writeJsBinding` API 生成 TypeScript 定义：

**generate-types.ts**

```ts
import { spawn } from 'node:child_process'
import { mkdir, writeFile, copyFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { generateTypeDef, writeJsBinding, parseTriple } from '@napi-rs/cli'

import pkg from './package.json' with { type: 'json' }

const currentTarget = 'x86_64-unknown-linux-gnu'

const currentDir = dirname(fileURLToPath(import.meta.url))
const typeDefDir = join(currentDir, 'target', 'napi-rs', 'YOUR_PKG_NAME')
const triple = parseTriple(currentTarget)
const binaryName = pkg.napi.binaryName
const bindingName = `${binaryName}.${triple.platformArchABI}.node`

await mkdir(typeDefDir, { recursive: true })

const childProcess = spawn(
  'cargo',
  ['build', '--release', '--target', currentTarget],
  {
    stdio: 'pipe',
    env: {
      ...process.env,
      NAPI_TYPE_DEF_TMP_FOLDER: typeDefDir,
    },
  },
)

childProcess.stdout.on('data', (data) => {
  console.log(data.toString())
})

childProcess.stderr.on('data', (data) => {
  console.error(data.toString())
})

await new Promise((resolve, reject) => {
  childProcess.on('error', (error) => {
    reject(error)
  })
  childProcess.on('close', (code) => {
    if (code === 0) {
      resolve(true)
    } else {
      reject(new Error(`cargo build --release failed with code ${code}`))
    }
  })
})

// Remove an old loaded binding before replacing it. Overwriting it in place
// can cause crashes on platforms such as macOS.
await rm(join(currentDir, bindingName)).catch(() => {
  // ignore a missing old binding
})

await copyFile(
  join(currentDir, 'target', currentTarget, 'release', 'libfoo.so'),
  join(currentDir, bindingName),
)

const { dts, exports } = await generateTypeDef({
  typeDefDir,
  cwd: process.cwd(),
})

await writeFile(join(currentDir, 'customized.d.ts'), dts)

await writeJsBinding({
  jsBinding: 'customized.js',
  platform: true,
  binaryName,
  packageName: pkg.name,
  version: pkg.version,
  outputDir: currentDir,
  idents: exports,
})
```

::: warning
`typeDefDir` 必须包含启用 `type-def` feature 时，由 `napi-derive` proc macro 生成的中间类型定义文件。通常 `napi build` 会在临时目录中创建这些文件。

:::

### 控制流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SETUP PHASE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Read package.json for napi config                                   │
│  2. Get target triple (from cli flag) (e.g.,'x86_64-unknown-linux-gnu') │
│  3. parseTriple() → get platformArchABI for binding filename            │
│  4. mkdir(typeDefDir) → create directory for type definitions           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BUILD PHASE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  5. spawn('cargo', ['build', '--release', '--target', currentTarget])   │
│     └─ env: { NAPI_TYPE_DEF_TMP_FOLDER: typeDefDir }                    │
│        ▲                                                                │
│        └─ This env var tells napi-derive where to write type defs       │
│                                                                         │
│  6. Stream stdout/stderr from cargo                                     │
│  7. await cargo completion                                              │
│  8. rm(old binding) → Remove old .node file before replacement          │
│  9. copyFile(libfoo.so → <binaryName>.{platform}.node)                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            类型生成阶段                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ 10. generateTypeDef({ typeDefDir, cwd })                                │
│     └─ 读取 typeDefDir 中以换行分隔的 JSON 文件                   │
│     └─ 返回 { dts: string, exports: string[] }                         │
│                                                                         │
│ 11. writeFile('customized.d.ts', dts)                                   │
│                                                                         │
│ 12. writeJsBinding({ platform, binaryName, idents: exports, ... })      │
│     └─ Generates JS loader that imports the .node file                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                              ┌───────────┐
                              │   DONE    │
                              │           │
                              │ Output:   │
                              │ • .node   │
                              │ • .d.ts   │
                              │ • .js     │
                              └───────────┘
```

### 核心概念

#### `NAPI_TYPE_DEF_TMP_FOLDER` 环境变量

设置 `NAPI_TYPE_DEF_TMP_FOLDER` 后运行 `cargo build`，`napi-derive` proc macro 会在该目录中为每个 Cargo 包写入一个无扩展名的文件，每行包含一个 JSON 对象。类型信息通过以下流程从 Rust 传递到 TypeScript：

```
Rust 代码 → napi-derive 宏 → 以换行分隔的 JSON → generateTypeDef() → .d.ts
```

#### 平台特定的绑定名称

`parseTriple()` 函数从 target triple 提取平台信息：

```ts
const triple = parseTriple('x86_64-unknown-linux-gnu')
// Returns: { platform: 'linux', arch: 'x64', abi: 'gnu', platformArchABI: 'linux-x64-gnu', ... }

const bindingName = `mylib.${triple.platformArchABI}.node`
// Result: 'mylib.linux-x64-gnu.node'
```

#### 删除旧绑定文件

在 macOS/Linux 上，如果不先删除现有 `.node` 文件就直接以新文件覆盖，可能导致段错误。请务必先删除旧文件：

```ts
await rm(join(currentDir, bindingName)).catch(() => {
  // ignore error if file doesn't exist
})
await copyFile(sourceLib, join(currentDir, bindingName))
```

### GenerateTypeDefOptions

| 选项                | 类型    | 必填 | 默认值 | 描述                                                                                                           |
| ------------------- | ------- | ---- | ------ | -------------------------------------------------------------------------------------------------------------- |
| typeDefDir          | string  | 是   |        | 包含中间类型定义文件的目录                                                                                     |
| cwd                 | string  | 是   |        | 解析相对路径的工作目录                                                                                         |
| noDtsHeader         | boolean | 否   | false  | 跳过默认文件头                                                                                                 |
| dtsHeader           | string  | 否   |        | <span class="chalk-green">.d.ts</span> 文件的自定义文件头字符串；仅在两个文件头文件选项都未设置时使用          |
| dtsHeaderFile       | string  | 否   |        | 相对 `cwd` 解析的文件头文件；优先级高于所有其他自定义文件头选项                                                |
| configDtsHeader     | string  | 否   |        | 配置中的文件头（优先级低于 dtsHeader）                                                                         |
| configDtsHeaderFile | string  | 否   |        | 配置中的文件头文件；优先级低于 `dtsHeaderFile`，但高于内联文件头字符串                                         |
| constEnum           | boolean | 否   | true   | 生成 <span class="chalk-green">const enum</span> 而不是普通 enum                                               |
| runtimeStringEnum   | boolean | 否   | false  | 与 `constEnum: false` 一起使用时，为 `#[napi(string_enum)]` 生成运行时枚举；否则生成仅存在于类型层的字符串联合 |

### WriteJsBindingOptions

| 选项        | 类型     | 必填 | 默认值     | 描述                                                          |
| ----------- | -------- | ---- | ---------- | ------------------------------------------------------------- |
| platform    | boolean  | 否   | false      | 生成 JS 绑定所必需；添加 platform triple                      |
| noJsBinding | boolean  | 否   | false      | 跳过 JS 绑定生成                                              |
| idents      | string[] | 是   |            | <span class="chalk-green">generateTypeDef</span> 导出的标识符 |
| jsBinding   | string   | 否   | 'index.js' | JS 绑定的自定义文件名                                         |
| esm         | boolean  | 否   | false      | 生成 ESM 而不是 CommonJS 格式                                 |
| binaryName  | string   | 是   |            | 原生二进制文件的名称                                          |
| packageName | string   | 是   |            | require/import 语句使用的包名                                 |
| version     | string   | 是   |            | 包版本                                                        |
| outputDir   | string   | 是   |            | 写入 JS 绑定文件的目录                                        |

## 其他导出 API

### NapiCli 类

以程序化方式访问所有 CLI 命令的主类：

```ts
import { NapiCli } from '@napi-rs/cli'

const cli = new NapiCli()

// Available methods:
cli.build(options) // Build the project
cli.artifacts(options) // Collect artifacts from CI
cli.new(options) // Create new project
cli.createNpmDirs(options) // Create npm package directories
cli.prePublish(options) // Prepare for publishing
cli.rename(options) // Rename project
cli.universalize(options) // Create universal binaries
cli.version(options) // Update versions
```

### 命令创建器

将 CLI 参数解析为命令选项对象：

```ts
import {
  createBuildCommand,
  createArtifactsCommand,
  createCreateNpmDirsCommand,
  createPrePublishCommand,
  createRenameCommand,
  createUniversalizeCommand,
  createVersionCommand,
  createNewCommand,
} from '@napi-rs/cli'

// Parse arguments as if running `napi build --release --platform`
const buildCmd = createBuildCommand(['--release', '--platform'])
const options = buildCmd.getOptions()
```

### 工具函数

```ts
import { parseTriple, readNapiConfig } from '@napi-rs/cli'

// Parse target triple string
const triple = parseTriple('x86_64-unknown-linux-gnu')
// { platform: 'linux', arch: 'x64', abi: 'gnu', ... }

// 第一个参数是 package.json 的精确路径。可选的第二个参数是优先级更高的独立 napi 配置。
const config = await readNapiConfig(
  '/path/to/project/package.json',
  '/path/to/project/napi.config.json',
)
```

## 中止构建

`build()` 方法返回一个用于取消构建的 `abort` 函数：

```ts
const { task, abort } = await cli.build(options)

// Handle SIGINT to abort cleanly
process.on('SIGINT', () => {
  abort()
  process.exit(1)
})

const outputs = await task
```
