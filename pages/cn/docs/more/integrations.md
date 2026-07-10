---
title: '集成与打包器'
description: 从 CommonJS、ESM、打包器、框架、Electron 和 serverless 部署加载 NAPI-RS 插件。
---

# 集成与打包器

`.node` 文件是 JavaScript 运行时加载的共享库。它不是 JavaScript，不应被转换、拼接进 bundle 或发送到浏览器。只要保持生成的加载器完整，并让 Node 在运行时执行，大多数集成问题都会消失。

## 理解生成的加载器

使用 `napi build --platform` 时，NAPI-RS 生成的 JavaScript 加载器会：

1. 检测 `process.platform`、`process.arch` 和 Linux libc。
2. 尝试 `addon.linux-x64-gnu.node` 这样的本地文件。
3. 尝试单独发布的可选包，例如 `@scope/addon-linux-x64-gnu`。
4. 原生加载失败时回退到已配置 WASI 绑定。
5. 抛出一个错误，其 `cause` 链包含原生候选项的加载失败。普通 WASI 回退失败不会加入该链；如需专门诊断 WASI，请使用 `NAPI_RS_FORCE_WASI=error`。

加载器还识别两个诊断控制项：

- `NAPI_RS_NATIVE_LIBRARY_PATH=/absolute/addon.node` 会用一个明确的原生库**替代**普通的原生平台与包选择。如果加载失败，加载器会记录错误并可继续尝试已配置的 WASI 回退，但不会再尝试普通原生候选项。
- `NAPI_RS_ENFORCE_VERSION_CHECK=1` 会拒绝版本与根包不同的单独发布平台包。

尽可能让加载器保留在应用 bundle 之外。它必须能够执行运行时检测，并从真实 `node_modules` 树解析可选依赖。

## 明确选择 CommonJS 或 ESM

原生库本身没有模块格式。只有生成的 JavaScript 加载器采用 CommonJS 或 ESM。

### CommonJS 包

```sh
napi build --platform --js index.cjs
```

**package.json**

```json
{
  "main": "./index.cjs",
  "types": "./index.d.ts"
}
```

```js
const { add } = require('@scope/addon')
```

如果包设置了 `"type": "module"`，请使用 `.cjs` 扩展名；否则 Node 会把 CommonJS 加载器当作 ESM 解析。

### ESM 包

```sh
napi build --platform --esm --js index.js
```

**package.json**

```json
{
  "type": "module",
  "main": "./index.js",
  "types": "./index.d.ts"
}
```

```js
import { add } from '@scope/addon'
```

生成的 ESM 加载器内部使用 `createRequire`，因为 Node 仍通过 `require` 加载 `.node` 库。`--esm` 会把导出 wrapper 改为真正的静态具名 ESM 导出；它不会转换原生二进制文件。

### 同时导出 CommonJS 和 ESM

从同一原生产物生成两个加载器：

**package.json**

```json
{
  "type": "module",
  "main": "./index.cjs",
  "module": "./index.js",
  "types": "./index.d.ts",
  "exports": {
    ".": {
      "types": "./index.d.ts",
      "import": "./index.js",
      "require": "./index.cjs"
    }
  },
  "scripts": {
    "build": "napi build --platform --js index.cjs && napi build --platform --esm --js index.js"
  }
}
```

在 CI 中同时测试 `import()` 和 `require()`。转译 ESM 的测试运行器可能走与普通 Node 不同的路径，因此仅在 Jest ESM 中出现的错误不能证明原生库加载失败。

## 推荐的打包策略：externalize

最稳健的应用构建会把根插件包保持为 external。部署中应包含：

- 生成的加载器；
- 根包元数据；
- 匹配的可选平台包及其 `.node` 文件。

这是未解决打包器需求（[napi-rs#1948](https://github.com/napi-rs/napi-rs/issues/1948)）中推荐的打包模型。它避免 hash 静态资源名、被移动的 `__dirname`，以及打包器急切跟踪每个平台特定 `require` 分支。

::: warning
将依赖标记为 external 意味着部署后的运行时仍必须能解析它。请复制生产依赖、在部署 image 中安装，或通过 serverless layer 提供。仅仅 externalize 并不会打包插件。

:::

### esbuild

**build.mjs**

```js
import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/server.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  external: ['@scope/addon', '@scope/addon-*'],
})
```

在 bundle 旁复制/安装 `@scope/addon` 及其匹配的可选依赖。除非有意选择单平台 inline-binary 包并验证最终相对路径，否则不要使用 `file`/`copy` loader。

### webpack

**webpack.config.cjs**

```js
module.exports = {
  target: 'node',
  externals: {
    '@scope/addon': 'commonjs @scope/addon',
  },
}
```

如果 import 名称是动态计算或被包装的，请使用 externals 函数/plugin，把整个插件包保持为 external。`node-loader` 可以复制直接导入的 `.node` 文件，但它自身无法保留生成加载器的平台与可选包控制流。

### 单平台 inline 二进制文件

某些内部应用只发布一个已知目标，并把 `.node` 文件放在根包，而非独立可选包。此时：

1. 将生成的 wrapper 保留为外部文件。
2. 复制 `.node` 文件，不添加内容 hash。
3. 保留 wrapper 预期的相对路径。
4. 如果可能有多个目标进入部署，则让构建失败。
5. 从最终 archive/image 测试，而不是源代码树。

这是部署特定优化，不是可移植 npm 包。

## Vite SSR 与 Astro

原生插件是仅限服务器的依赖。不要让它进入 Vite 依赖优化和 SSR bundle：

**vite.config.ts**

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@scope/addon'],
  },
  ssr: {
    external: ['@scope/addon'],
  },
})
```

只从服务器模块导入插件。会打包到浏览器的组件无法加载原生 `.node` 库。

Astro 使用 Vite，因此同样通过其 `vite` 配置 externalize。当 CommonJS 包没有向 Rollup 暴露具名导出时，可以用 `--esm` 生成 NAPI-RS wrapper，或在服务器代码中加载 CommonJS 包：

```ts
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { add } = require('@scope/addon')
```

Astro 集成报告 [napi-rs#2206](https://github.com/napi-rs/napi-rs/issues/2206) 仍未解决。请验证 adapter 最终的服务器输出，因为 adapter 可能在 Vite 之后再执行一次打包。

## Next.js

只在 Node.js runtime 中使用插件：route handler、server action，或未指定 Edge runtime 的 server component。将包从服务器 bundle 中 externalize：

**next.config.mjs**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@scope/addon'],
}

export default nextConfig
```

**app/api/add/route.ts**

```ts
export const runtime = 'nodejs'

import { add } from '@scope/addon'

export function GET() {
  return Response.json({ value: add(20, 22) })
}
```

不要从 Client Component、使用 Edge runtime 的 middleware 或与二者共享的代码导入插件。确保部署平台复制 external 包及其可选二进制依赖。

## Electron

Electron 可以在主进程以及启用 Node 的 preload/renderer 上下文中加载 Node-API 插件。优先在主进程或 preload 脚本中加载，再暴露窄范围 IPC API；在 renderer 中启用不受限制的 Node 集成会扩大应用安全边界。

对于打包应用：

- 为 Electron 实际操作系统和 CPU 构建/安装二进制文件；
- 将 `.node` 文件留在 ASAR 压缩之外（`asarUnpack`），或使用打包器的原生模块解包支持；
- 将可选平台包保留在生产依赖中；
- 测试已安装/打包的产物，包括窗口 reload 与 shutdown；
- 测试分发的每种 Electron 架构。

Node-API 降低了对特定 V8 ABI 的依赖，但不会让 Linux x64 二进制文件在 Windows 或 macOS 加载。如果另一依赖使用 V8 addon ABI 而非 Node-API，它仍可能需要 Electron 特定重新构建。

## Serverless 与容器

为**部署运行时**构建并安装，而不是开发者笔记本。例如 Linux Lambda 部署需要适用于函数 x64 或 arm64 架构、且 glibc 兼容的 Linux 二进制文件。

可靠流程如下：

1. 从 CI 构建/发布各自独立的平台包。
2. 为部署平台安装生产依赖。
3. 从 JavaScript bundle 中 externalize 插件。
4. 将根包和可选平台包复制到 image、function 或 layer。
5. 在 provider 的 base image 中启动最终产物，并调用一个原生导出作为 smoke test。

Linux libc 与目标选择请遵循[交叉编译](/cn/docs/cross-build)。如果 provider 不允许原生插件，但提供所需 WASI runtime feature，可以考虑有文档支持的 [WASI 回退](/cn/docs/concepts/webassembly)，并明确测试该宿主。

## 诊断打包后的部署

在最终 container/archive 环境中运行以下探针：

```sh
node -p "process.execPath"
node -p "process.platform + ' ' + process.arch"
node -p "process.report?.getReport?.().header.glibcVersionRuntime || 'no glibc version reported'"
npm ls @scope/addon
```

然后使用普通 Node 导入 external 包。如果打包前能工作、最终 bundle 中不能，请检查打包器是否移动了加载器、重命名 `.node` 文件、移除了可选依赖，或选择了 Edge/浏览器 runtime。[故障排除指南](/cn/docs/more/troubleshooting)介绍如何打印 `cause` 链中的原生加载失败，以及如何单独强制执行 WASI 诊断。
