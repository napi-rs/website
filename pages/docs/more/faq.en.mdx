---
description: Frequently asked questions about napi-rs.
---

# Frequently Asked Questions

## Build for `Linux alpine`

> https://github.com/rust-lang/rust/pull/40113#issuecomment-323193341

You cannot set compile `crate-type` to `cdylib` when the compile target is `*-unknown-linux-musl` by default.

If you want to do so, you need to pass `-C target-feature=-crt-static` to `rustc`.

There are two ways to pass this argument:

- Set `RUSTFLAGS` env, `RUSTFLAGS="-C target-feature=-crt-static"`
- Set it in `.cargo/config.toml`:

  ```toml
  [target.x86_64-unknown-linux-musl]
  rustflags = ["-C", "target-feature=-crt-static"]
  ```

## Build for `Windows i686`

There is `codegen` error when compile target is `i686-windows-*`: [Rust issue 67497](https://github.com/rust-lang/rust/issues/67497).

There is a workaround to avoid this issue:

- Set `lto` to false. If you haven't set lto in your `Cargo.toml`, the value is false by default, so you can ignore this step.
- Set `codegen-units` to `32` (or higher). The default value of `codegen-units` is `16` when the compile target is release. You can set `CARGO_PROFILE_RELEASE_CODEGEN_UNITS=32` and `CARGO_PROFILE_RELEASE_LTO='false'` to make the compiler happy when targeting `i686-windows-*`. Here is an [example](https://github.com/napi-rs/package-template/blob/main/.github/workflows/CI.yml#L90).
