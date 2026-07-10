---
title: '支持矩阵徽章'
description: 在任意 README 中嵌入 napi.rs 的跨平台支持矩阵徽章——完全由 URL 查询参数生成、自包含且经过边缘缓存的 SVG 或 PNG。
---

# 支持矩阵徽章

`napi.rs` 会把你的包的跨平台支持矩阵渲染成一张完全由 URL 查询字符串生成的、自包含的图片。只要让 README 里的
`<img>` 或 `<picture>` 指向它，徽章就会渲染出各个平台标记、对应的等级配色以及 Node.js 版本行——无需构建步骤、无需生成资源文件、也无需把文件提交进仓库。图片是其查询参数的纯函数，因此边缘可以放心地长时间缓存它，只有当你改变 URL 时它才会变化。

## 两个端点

| 端点                              | 适用场景                                                        |
| --------------------------------- | --------------------------------------------------------------- |
| `GET /support-matrix.svg?<query>` | GitHub README。在 `<picture>` 里放两个来切换亮色/暗色。         |
| `GET /support-matrix.png?<query>` | npm 与 crates.io，它们的 README 会剥离 `<picture>` 和内联 SVG。 |

两者接受相同的查询参数，并默认使用亮色主题。

## 构建你的 URL

你几乎不需要手写这段查询参数。位于 [/cn/support-matrix](/cn/support-matrix) 的交互式构建器可以让你为每个等级挑选 target
triple、填入你的 `engines` 范围，并直接为你复制好完整的 `<picture>` 与 PNG 片段。本页其余部分记录的是构建器所生成的这份契约。

## 查询参数

| 参数          | 作用                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `tested`      | CI 会运行并作为门禁的 Rust target triple，逗号分隔——绿色标记。字面量 `full` 会展开为 `napi new` 脚手架集合。                            |
| `nonblocking` | CI 任务为非阻塞（`continue-on-error`）的 triple——琥珀色标记。                                                                           |
| `untested`    | 已构建但未在 CI 中实际运行的 triple——灰色标记。                                                                                         |
| `omit`        | 在各等级解析完成后要移除的 triple 或操作系统分组名。分组：`macos`、`windows`、`linux`、`android`、`freebsd`、`openharmony`、`browser`。 |
| `engines`     | 包的 `engines.node` 范围，例如 `^22.20 \|\| ^24.12 \|\| >=25`。据此推导出 `vMIN → vMAX` 标题行，以及被排除的主版本和部分区间列表。      |
| `nodeTested`  | CI 会运行的 Node 主版本，逗号分隔，例如 `22,24`。将这些版本药丸标记为已测试。                                                           |
| `wasm`        | `1` 会强制显示 Browser（WASI）卡片。当存在 `wasm32-wasi*` triple 时它也会自动开启。                                                     |
| `name`        | 展示在标题与图片 alt 文本里的装饰性包名。                                                                                               |
| `theme`       | `light`（默认）或 `dark`。                                                                                                              |

取值均为规范的 Rust target triple（`x86_64-unknown-linux-gnu`、`aarch64-apple-darwin` ……）。两种常见的别名写法
`wasm32-wasi-preview1-threads` 与 `arm-linux-androideabi` 也被接受，并会被归一化为规范形式。

## 查询如何解析

服务按固定顺序处理，且永不抛错：未知的 triple、未知的分组名以及格式错误的参数都会被跳过，因此即便 URL 略有偏差也仍会渲染出合理的结果。

1. **`full` 为某个等级注入种子**，即 `napi new` 生成的那批 target。
2. **显式 triple 会覆盖种子。** 在任意等级里点名某个 triple，都会胜过 `full` 为它注入的等级。
3. **同一 triple 出现在两个等级时，最严重的等级获胜**：`untested` > `nonblocking` > `tested`。
4. **`omit` 最后做减法**，按 triple 或按操作系统分组移除。
5. **你从不构建的平台直接留空即可**——不存在"不支持"等级，把这些 triple 从所有列表里省略就行。

## 嵌入方式

对于 GitHub README，用一个 `<picture>` 分别提供亮色与暗色 SVG，让徽章跟随读者的主题：

```html
<picture>
  <source
    media="(prefers-color-scheme: dark)"
    srcset="https://napi.rs/support-matrix.svg?theme=dark&tested=full&engines=^22.20 || ^24.12 || >=25"
  />
  <img
    alt="napi-rs support matrix"
    src="https://napi.rs/support-matrix.svg?theme=light&tested=full&engines=^22.20 || ^24.12 || >=25"
  />
</picture>
```

npm 与 crates.io 会剥离 `<picture>`，所以在那里使用单张 PNG：

```md
![support matrix](https://napi.rs/support-matrix.png?tested=full&engines=^22.20 || ^24.12 || >=25)
```

## 完整示例

`@napi-rs/lzma` 的徽章把两个 Linux triple 标为非阻塞、另外四个标为未测试、在 CI 中跟踪 Node 22 与 24，并支持 Node
`^22.20 || ^24.12 || >=25`：

```
https://napi.rs/support-matrix.svg?tested=full
  &nonblocking=powerpc64le-unknown-linux-gnu,s390x-unknown-linux-gnu
  &untested=riscv64gc-unknown-linux-gnu,aarch64-linux-android,arm-linux-androideabi,wasm32-wasi-preview1-threads
  &engines=^22.20 || ^24.12 || >=25&nodeTested=22,24&name=@napi-rs/lzma
```

它会渲染出 `v22.20 → v26` 的 Node 标题行，其中 `23` 与 `24.0–24.11` 被标为已排除，ppc64le 与 s390x 标记为琥珀色，riscv64、两个
Android 以及 Browser 标记为灰色。上面的换行只是为了便于阅读——请把它作为一行发送（构建器会为你把 `engines` 里的空格做百分号编码）。
