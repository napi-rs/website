---
title: '版本'
description: '@napi-rs/cli 中的 napi version 命令。'
---

# 版本

更新已创建 npm 包中的版本。

## 用法

```sh
# CLI
napi version [--options]
```

```typescript
// Programmatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().version({
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
