---
title: 交叉编译常见问题
description: 解答 napi-rs 交叉编译与原生加载中的常见问题。
---

# 交叉编译常见问题

本页收集目标特定的构建问题。对于安装、加载、运行时、类型生成与发布故障，请从[故障排除指南](./troubleshooting)开始。选择交叉编译策略请使用[交叉编译](../cross-build)决策指南。

## 为 `Linux alpine` 构建

> https://github.com/rust-lang/rust/pull/40113#issuecomment-323193341

默认情况下，编译目标为 `*-unknown-linux-musl` 时不能把 `crate-type` 设置为 `cdylib`。

如果确实需要这样做，必须向 `rustc` 传入 `-C target-feature=-crt-static`。

**NAPI-RS** CLI 会自动处理：对于任意 `*musl*` 目标，`napi build` 都会自动把 `-C target-feature=-crt-static` 追加到 `RUSTFLAGS` 环境变量；`napi new` 生成的项目开箱即用地以这种方式构建 musl 目标。

因为 CLI 通过 `RUSTFLAGS` 环境变量导出该设置，musl 构建会忽略 `.cargo/config.toml` 中的所有 `rustflags`（Cargo 中环境变量优先）。若 musl 目标需要额外 `rustc` 标志，请把它们加入 `RUSTFLAGS` 环境变量，而不是 `.cargo/config.toml`。

如果使用 [`mimalloc`](https://github.com/purpleprotocol/mimalloc_rust) allocator，请为 musl 目标启用其 `local_dynamic_tls` feature；否则插件可能因线程局部存储分配错误而在运行时失败。

参见[交叉编译](../cross-build)，了解如何从任意宿主机构建 musl 目标。

## 找不到 `GLIBC_x.yy`

```
Error: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.38' not found
```

`*-linux-gnu` 插件动态链接 glibc，并且要求至少使用**构建机器**上的 glibc 版本。如果构建宿主机的发行版比部署宿主机更新，插件就会因该错误而无法加载。

解决方法是针对更旧的 glibc 构建：

- 在 Linux x64/arm64 宿主机上使用 `--use-napi-cross` 构建——它将最低 glibc 版本固定为 **2.17**，几乎能在所有 glibc 发行版上加载。
- 从 macOS 或 Windows 宿主机使用 `--cross-compile`（`-x`）构建——最低版本为 zig 的默认 glibc，比 2.17 更新，但不受宿主机发行版影响。

不要改用 `*-musl` 目标来修复此错误——musl 是 Alpine 类发行版使用的另一种 libc，不是降低 glibc 要求的手段。详情参见 [Glibc 版本](../cross-build#glibc-版本)。

## rustls / `aws-lc-sys` 在 aarch64 上配合 `--use-napi-cross` 失败

如果 crate 依赖 `rustls`——常见情况是通过 `reqwest` 或 `hyper-rustls` 间接依赖——其默认后端 `aws-lc-sys` 在使用 `--use-napi-cross` 交叉编译 `aarch64-unknown-linux-gnu` 时会失败：[`@napi-rs/cross-toolchain`](https://github.com/napi-rs/cross-toolchain) 自带的 gcc 对 `aws-lc-sys` 来说太旧（[cross-toolchain#4](https://github.com/napi-rs/cross-toolchain/issues/4)）。

有两种变通方案：

- 使用 `clang` 而不是自带 gcc 编译 C 部分：

  ```sh
  TARGET_CC=clang TARGET_CXX=clang++ napi build --release --target aarch64-unknown-linux-gnu --use-napi-cross
  ```

- 使用 `--cross-compile`（`-x`）代替 `--use-napi-cross`。

其他常见 C/C++ 交叉编译问题参见交叉编译指南的[原生依赖](../cross-build#原生依赖)一节。

## 为 `Windows i686` 构建

编译目标为 `i686-windows-*` 时存在 `codegen` 错误：[Rust issue 67497](https://github.com/rust-lang/rust/issues/67497)。

可通过以下方式规避：

- 将 `lto` 设为 false。如果没有在 `Cargo.toml` 中设置 lto，其默认值就是 false，可以跳过此步。
- 将 `codegen-units` 设为 `32` 或更高。release 目标默认的 `codegen-units` 是 `16`。面向 `i686-windows-*` 时，可设置 `CARGO_PROFILE_RELEASE_CODEGEN_UNITS=32` 和 `CARGO_PROFILE_RELEASE_LTO='false'`。参见此[示例](https://github.com/napi-rs/package-template/blob/50ecdec7c7d31c60b693d5d52be6e13ba9b32bf8/.github/workflows/CI.yaml#L89-L91)。
