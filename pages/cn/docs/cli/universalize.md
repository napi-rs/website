---
title: '创建通用二进制文件'
description: '@napi-rs/cli 中的 napi universalize 命令。'
---

# 创建通用二进制文件

将已构建的二进制文件合并为一个通用二进制文件。

## 用法

```sh
# CLI
napi universalize [--options]
```

```typescript
// Programmatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().universalize({
  // options
})
```

## 选项

| 选项            | CLI 选项            | 类型   | 必填  | 默认值                                        | 描述                                                                                                                                 |
| --------------- | ------------------- | ------ | ----- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
|                 | --help,-h           |        |       |                                               | 获取帮助                                                                                                                             |
| cwd             | --cwd               | string | false | process.cwd()                                 | napi 命令执行的工作目录，其他所有路径选项都相对于该路径                                                                              |
| configPath      | --config-path,-c    | string | false |                                               | <span class="chalk-green">napi</span> 配置 JSON 文件的路径                                                                           |
| packageJsonPath | --package-json-path | string | false | <span class="chalk-green">package.json</span> | <span class="chalk-green">package.json</span> 的路径                                                                                 |
| outputDir       | --output-dir,-o     | string | false | <span class="chalk-green">./</span>           | 存放所有已构建 <span class="chalk-green">.node</span> 文件的目录，与 build 命令的 <span class="chalk-green">--output-dir</span> 相同 |
