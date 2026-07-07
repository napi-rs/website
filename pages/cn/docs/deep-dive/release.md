---
title: '发布原生包'
description: 原生包发布方式的历史。
---

# 发布原生包

从前面部分的介绍可以窥见，目前社区上主流的分发方式是 **_直接分发 `C/C++` 源码_**。但这种方式对于使用 `Rust` 编写 Node.js native addon 的开发者来说，并不是一种可以接受的分发方案，因为 Rust 工具链的复杂性和编译耗时等问题，直接分发源码对使用这些 native addon 的开发者来说会是一种巨大的折磨。

下面我将介绍包括 **_直接分发源码_** 在内的 native addon 的几种分发方式，在介绍完之后相信你能找到最适合 `Rust` 的 native addon 分发方式。

## 1. 分发源码

使用这种方式要求用户安装 `node-gyp`、`cmake`、`g++` 等构建工具。这在开发阶段不是问题，但随着 `Docker` 的流行，在给定的 `Docker` 环境中安装一堆构建工具链对很多团队来说是一场噩梦。而且如果这个问题处理不好，还会平白增大 `Docker image` 的体积（其实这个问题可以通过在编译前使用专门的 Builder 镜像来构建 Docker image 解决，但我与各种公司交流过，很少有团队会这么做）。

## 2. 只分发 JavaScript 代码，在 `postinstall` 阶段下载对应的产物

有些 native addon 的构建依赖非常复杂，让普通 Node 开发者在开发阶段安装全套构建工具并不现实。另一种场景是 native addon 本身非常复杂，编译可能耗费大量时间，库作者不希望别人在使用他的库时，光是安装就要花上几个小时。

因此另一种流行的方式是借助 `CI` 工具，在 `CI` 任务中为每个平台（win32/darwin/linux/...）**_预编译_** native addon，只分发对应的 JavaScript 代码，而 **_预编译_** 好的 addon 文件则通过 `postinstall` 脚本从 **CDN/GitHub release** 下载。例如社区里有一个流行的工具就是这么做的：[node-pre-gyp](https://github.com/mapbox/node-pre-gyp)。这个工具根据用户的配置，把 `CI` 中编译好的 native addon 自动上传到特定位置，然后在安装阶段从上传位置下载。

这种分发方式看起来天衣无缝，但有几个绕不开的问题：

- `node-pre-gyp` 这类工具会给项目引入大量**与运行时无关**的依赖。
- 无论上传到哪个 `CDN`，都很难照顾到全世界的用户。你是否还记得被卡在 `postinstall` 阶段几个小时、从某个 GitHub release 下载文件最后还失败了的痛苦回忆？确实，在最近的地区建立二进制镜像可以部分缓解这个问题，但镜像时常不同步/缺失。
- 对私有网络不友好。很多公司的 CI/CD 机器可能无法访问外网（它们会配套一个私有 NPM，如果连这个都没有就没有讨论的意义了），更不用说从某个 CDN 下载 native addon 了。

## 3. 不同平台的 native addon 通过不同的 npm 包分发

在前端非常流行的新一代构建工具 [esbuild](https://github.com/evanw/esbuild) 就采用了这种方式。每个 native addon 对应一个 npm 包，然后由 `postinstall` 脚本安装当前系统对应的 native addon 包。

另一种方式是把要安装的包直接暴露给用户，将所有原生包作为 `optionalDependencies`，再利用 `package.json` 中的 `os` 和 `cpu` 字段，让 `npm/yarn/pnpm` 在安装时*自动选择要安装的原生包（与系统要求不匹配的包实际上会安装失败）*，例如：

```json
{
  "name": "@node-rs/bcrypt",
  "version": "0.5.0",
  "os": ["linux", "win32", "darwin"],
  "cpu": ["x64"],
  "optionalDependencies": {
    "@node-rs/bcrypt-darwin": "^0.5.0",
    "@node-rs/bcrypt-linux": "^0.5.0",
    "@node-rs/bcrypt-win32": "^0.5.0"
  }
}
```

```json
{
  "name": "@node-rs/bcrypt-darwin",
  "version": "0.5.0",
  "os": ["darwin"],
  "cpu": ["x64"]
}
```

```json
{
  "name": "@node-rs/bcrypt-linux",
  "version": "0.5.0",
  "os": ["linux"],
  "cpu": ["x64"]
}
```

```json
{
  "name": "@node-rs/bcrypt-win32",
  "version": "0.5.0",
  "os": ["win32"],
  "cpu": ["x64"]
}
```

对使用 native addon 的用户来说，这种分发方式的侵入性最小，[@ffmpeg-installer/ffmpeg](https://github.com/kribblo/node-ffmpeg-installer#readme) 就在使用它。

然而，这种方式给 native addon 的作者带来了额外的工作量，包括需要编写管理发布二进制和一堆包的工具，而这些工具通常非常难调试（并且往往横跨多个系统和 CPU 架构）。

这些工具需要管理从开发 -> 本地发布版本 -> CI -> 产物 -> 部署阶段的整个 addon 流程。除此之外，还有大量 CI/CD 配置要编写/调试，既耗时又乏味。

## 结论

采用第 3 种分发方式（**不同平台的 native addon 通过不同的 npm 包分发**）的 native addon 最易用，对使用它的开发者来说心智负担最小，但这种分发方式会给 native addon 的作者带来额外的维护成本。

**NAPI-RS** 接管了这部分工作：

- [交叉编译](../cross-build) —— 用少数几台 CI 宿主机构建所有目标平台。
- [`napi artifacts`](/docs/cli/artifacts) —— 把 CI 中构建的二进制复制到各平台的 npm 包中。
- [`napi pre-publish`](/docs/cli/pre-publish) —— 更新 `package.json` 并发布各平台的包。
