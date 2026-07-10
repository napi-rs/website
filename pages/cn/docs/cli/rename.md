---
title: '重命名'
description: '@napi-rs/cli 中的 napi rename 命令。'
---

# 重命名

重命名 **NAPI-RS** 项目。

## 用法

```sh
# CLI
napi rename [--options]
```

```typescript
// Programmatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().rename({
  // options
})
```

## 选项

| 选项            | CLI 选项            | 类型   | 必填  | 默认值                                        | 描述                                                       |
| --------------- | ------------------- | ------ | ----- | --------------------------------------------- | ---------------------------------------------------------- |
|                 | --help,-h           |        |       |                                               | 获取帮助                                                   |
| cwd             | --cwd               | string | false | process.cwd()                                 | napi 命令执行的工作目录，其他所有路径选项都相对于该路径    |
| configPath      | --config-path,-c    | string | false |                                               | <span class="chalk-green">napi</span> 配置 JSON 文件的路径 |
| packageJsonPath | --package-json-path | string | false | <span class="chalk-green">package.json</span> | <span class="chalk-green">package.json</span> 的路径       |
| npmDir          | --npm-dir           | string | false | <span class="chalk-green">npm</span>          | 存放 npm 包的目录路径                                      |
| name            | --name,-n           | string | false |                                               | 项目的新名称                                               |
| binaryName      | --binary-name,-b    | string | false |                                               | `*.node` 文件的新二进制名称                                |
| packageName     | --package-name      | string | false |                                               | 项目的新包名                                               |
| manifestPath    | --manifest-path     | string | false | <span class="chalk-rust">Cargo.toml</span>    | <span class="chalk-rust">Cargo.toml</span> 的路径          |
| repository      | --repository        | string | false |                                               | 项目的新仓库地址                                           |
| description     | --description       | string | false |                                               | 项目的新描述                                               |
