---
title: 'V2 到 V3 迁移指南'
description: NAPI-RS V2 到 V3 的迁移指南。
---

## 配置

napi 配置已经变更，`name` 字段现为 `binaryName`。

### `napi.name` -> `napi.binaryName`

**package.json**

```diff
{
  "name": "@napi-rs/package-template",
  "version": "1.0.0",
  "napi": {
-   "name": "my-package",
+   "binaryName": "my-package",
  }
}
```

### `napi.triples -> napi.targets`

`triples` 配置已经移除，需要改用 `targets`。

以前 `triples.default` 包含：

```
"x86_64-unknown-linux-gnu",
"x86_64-pc-windows-msvc",
"x86_64-apple-darwin"
```

现在需要将它们加入 `targets` 配置。

**package.json**

```diff
{
  "name": "@napi-rs/package-template",
  "version": "1.0.0",
  "napi": {
-   "triples": {
-     "default": true,
-     "additional": [
-      "aarch64-apple-darwin",
-      "x86_64-unknown-linux-musl",
-      "aarch64-unknown-linux-musl"
-    ]
-   }
+   "targets": [
+     "x86_64-unknown-linux-gnu",
+     "x86_64-pc-windows-msvc",
+     "x86_64-apple-darwin",
+     "aarch64-apple-darwin",
+     "x86_64-unknown-linux-musl",
+     "aarch64-unknown-linux-musl"
+   ]
  }
}
```

## CLI 破坏性变更

CLI 已经重写。

`--cargo-cwd` 已移除，请使用 `--manifest-path` 指向 `Cargo.toml` 路径：

```diff
- napi build --cargo-cwd ./crates/napi
+ napi build --manifest-path ./crates/napi/Cargo.toml
```

以前，`napi build` 中的标志相对于 `--cargo-cwd || process.cwd()`；现在它们相对于 `--cwd || process.cwd()`。

### 已移除 `--cargo-flags`

`--cargo-flags` 选项已经移除。现在，`--` 之后的标志会透传给 cargo build 命令：

```diff
- napi build --cargo-flags="--locked"
+ napi build -- --locked
```

`--locked` 会传给 `cargo build`，最终执行 `cargo build --locked`。

### `create-npm-dir` 重命名为 `create-npm-dirs`

更多细节参见 [**create-npm-dirs**](/docs/cli/create-npm-dirs)。

除命令名和标志变化外，现在也不再建议提交所有 `npm/*` 文件。可以在 CI 中使用 `napi create-npm-dirs` 创建 `npm/` 文件，例如：https://github.com/napi-rs/package-template/blob/main/.github/workflows/CI.yml#L358

### `napi universal` 重命名为 `napi universalize`

更多细节参见 [**universalize**](/docs/cli/universalize)。

## `napi` crate

### 部分 JsValue 现在位于 `compat-mode` feature flag 之后

完整列表如下：

- `JsObject`
- `JsFunction`
- `JsNull`
- `JsBoolean`
- `JsUndefined`
- `JsBuffer`
- `JsBufferView`
- `JsArrayBuffer`
- `JsArrayBufferView`
- `JsTypedArray`
- `JsBigint`
- `Ref`

这些 API 不安全；详情参见 [**V3 中的生命周期**](/blog/announce-v3#lifetime)。

如果正在使用这些 API，需要启用 `compat-mode` feature flag，但不推荐这样做。

可以迁移到新 API。更多细节参见[值](/docs/concepts/values)、[函数](/docs/concepts/function)、[引用](/docs/concepts/reference)和 [TypedArray](/docs/concepts/typed-array)。

### `ThreadsafeFunction`

[`ThreadsafeFunction`](/docs/concepts/threadsafe-function) 已经完全重写。背景参见 [**V3 中的 ThreadsafeFunction**](/blog/announce-v3#threadsafefunction)。

新 API 文档见 [`ThreadsafeFunction`](/docs/concepts/threadsafe-function)。

### `napi::module_init` 移至 `napi_derive::module_init`

这是由上游 [`ctor`](https://github.com/mmastrac/rust-ctor) crate 的破坏性变更引起的。

## `napi_derive` crate

### 新增 `#[napi(module_exports)]`

它用于替代 `compat-mode` 中的 `#[module_exports]` 宏。现在可以移除 `napi-derive` 的 `compat-mode` feature，只使用现代 `#[napi]` 宏。
