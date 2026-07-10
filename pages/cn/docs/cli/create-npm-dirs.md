---
title: '创建 npm 目录'
description: '@napi-rs/cli 中的 napi create-npm-dirs 命令。'
---

# 创建 npm 目录

为不同平台创建 npm 包目录。

## 用法

```sh
# CLI
napi create-npm-dirs [--options]
```

```typescript
// Programmatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().createNpmDirs({
  // options
})
```

## 选项

| 选项            | CLI 选项            | 类型    | 必填  | 默认值                                        | 描述                                                       |
| --------------- | ------------------- | ------- | ----- | --------------------------------------------- | ---------------------------------------------------------- |
|                 | --help,-h           |         |       |                                               | 获取帮助                                                   |
| cwd             | --cwd               | string  | false | process.cwd()                                 | napi 命令执行的工作目录，其他所有路径选项都相对于该路径    |
| configPath      | --config-path,-c    | string  | false |                                               | <span class="chalk-green">napi</span> 配置 JSON 文件的路径 |
| packageJsonPath | --package-json-path | string  | false | <span class="chalk-green">package.json</span> | <span class="chalk-green">package.json</span> 的路径       |
| npmDir          | --npm-dir           | string  | false | <span class="chalk-green">npm</span>          | 存放 npm 包的目录路径                                      |
| dryRun          | --dry-run           | boolean | false | false                                         | 试运行，不修改文件系统                                     |
