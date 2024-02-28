---
description: Frequently asked questions about napi-rs.
---

# Perguntas Frequentes

## Compilar para `Linux alpine`

> https://github.com/rust-lang/rust/pull/40113#issuecomment-323193341

Você não pode definir o `crate-type` de compilação para `cdylib` ao compilar para o destino `*-unknown-linux-musl` por padrão.

Se você deseja fazer isso, precisa passar `-C target-feature=-crt-static` para `rustc`.

Existem duas maneiras de passar esse argumento:

- Defina a variável de ambiente `RUSTFLAGS`, `RUSTFLAGS="-C target-feature=-crt-static"`
- Defina no arquivo `.cargo/config.toml`:

  ```toml
  [target.x86_64-unknown-linux-musl]
  crt_static = false
  ```

## Compilar para `Windows i686`

Há um erro de `codegen` ao compilar para o destino `i686-windows-*`: [Rust issue 67497](https://github.com/rust-lang/rust/issues/67497).

Existe uma solução alternativa para evitar esse problema:

- Defina `lto` como falso, se você não tiver definido lto em seu `Cargo.toml`, o valor é falso por padrão, você pode ignorar este.
- Defina `codegen-units` para `32` (ou maior). O valor padrão de `codegen-units` é `16` por padrão ao compilar para release, você pode definir `CARGO_PROFILE_RELEASE_CODEGEN_UNITS=32` e `CARGO_PROFILE_RELEASE_LTO='false'` para deixar o compilador feliz ao direcionar `i686-windows-*`. Aqui está um [exemplo](https://github.com/napi-rs/package-template/blob/main/.github/workflows/CI.yaml#L90).
