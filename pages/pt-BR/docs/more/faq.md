---
title: FAQ de compilação cruzada
description: Respostas para dúvidas recorrentes sobre compilação cruzada e carregamento nativo no napi-rs.
---

# FAQ de compilação cruzada

Esta página reúne perguntas sobre build específicas de targets. Para falhas de
instalação, carregamento, runtime, geração de tipos e publicação, comece pelo
[guia de solução de problemas](./troubleshooting). Para escolher uma estratégia
de compilação cruzada, use o guia de decisão [Compilação cruzada](../cross-build).

## Compilar para `Linux alpine` {#build-for-linux-alpine}

> https://github.com/rust-lang/rust/pull/40113#issuecomment-323193341

Por padrão, você não pode definir o `crate-type` de compilação como `cdylib`
quando o target de compilação é `*-unknown-linux-musl`.

Se quiser fazer isso, você precisa passar `-C target-feature=-crt-static` para
o `rustc`.

A CLI do **NAPI-RS** cuida disso para você: para qualquer target `*musl*`,
`napi build` adiciona automaticamente `-C target-feature=-crt-static` à
variável de ambiente `RUSTFLAGS`, e o projeto gerado por `napi new` já compila
seus targets musl dessa forma.

Como a CLI exporta isso pela variável de ambiente `RUSTFLAGS`, quaisquer
`rustflags` no seu `.cargo/config.toml` são ignorados em builds musl
(variáveis de ambiente têm precedência no Cargo). Se você precisar de flags
extras do `rustc` para um target musl, adicione-as à variável de ambiente
`RUSTFLAGS` em vez do `.cargo/config.toml`.

Se você usa o allocator [`mimalloc`](https://github.com/purpleprotocol/mimalloc_rust),
habilite a feature `local_dynamic_tls` dele para targets musl; caso contrário,
o addon pode falhar em runtime com um erro de alocação de thread-local storage.

Veja [Compilação cruzada](../cross-build) para como compilar targets musl a
partir de qualquer host.

## `GLIBC_x.yy` not found

```
Error: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.38' not found
```

Um addon `*-linux-gnu` linka dinamicamente contra glibc e exige, no mínimo, a
versão de glibc da máquina que o **compilou**. Se o host de build roda uma
distro mais nova do que o host de deploy, o addon falha ao carregar com esse
erro.

A correção é compilar contra uma glibc mais antiga:

- Em um host Linux x64/arm64, compile com `--use-napi-cross` — ele fixa o piso
  de glibc em **2.17**, que carrega em praticamente qualquer distro com glibc.
- A partir de um host macOS ou Windows, compile com `--cross-compile` (`-x`) —
  o piso passa a ser a glibc padrão do zig: mais nova que 2.17, mas
  independente da distro do seu host.

**Não** mude para um target `*-musl` para corrigir esse erro. Musl é uma libc
diferente, para distros no estilo Alpine, e não uma forma de reduzir um
requisito de glibc. Veja [Glibc versions](../cross-build#glibc-versions) para
os detalhes.

## rustls / `aws-lc-sys` falha com `--use-napi-cross` em aarch64

Se o seu crate depende de `rustls` — muitas vezes transitivamente, via
`reqwest` ou `hyper-rustls` — o backend padrão dele, `aws-lc-sys`, falha ao
fazer compilação cruzada para `aarch64-unknown-linux-gnu` com
`--use-napi-cross`: o gcc incluído em
[`@napi-rs/cross-toolchain`](https://github.com/napi-rs/cross-toolchain) é
antigo demais para `aws-lc-sys`
([cross-toolchain#4](https://github.com/napi-rs/cross-toolchain/issues/4)).

Duas soluções de contorno:

- Compile as partes em C com `clang` em vez do gcc incluído:

  ```sh
  TARGET_CC=clang TARGET_CXX=clang++ napi build --release --target aarch64-unknown-linux-gnu --use-napi-cross
  ```

- Use `--cross-compile` (`-x`) em vez de `--use-napi-cross`.

Veja a seção [Native dependencies](../cross-build#native-dependencies) do guia
de Compilação cruzada para outros problemas recorrentes de compilação cruzada
de C/C++.

## Compilar para `Windows i686`

Há um erro de `codegen` quando o target de compilação é `i686-windows-*`:
[Rust issue 67497](https://github.com/rust-lang/rust/issues/67497).

Existe uma solução alternativa para evitar esse problema:

- Defina `lto` como falso. Se você não tiver definido `lto` no `Cargo.toml`, o
  valor já é falso por padrão, então pode ignorar esta etapa.
- Defina `codegen-units` como `32` (ou mais). O valor padrão de
  `codegen-units` é `16` quando o target de compilação é release. Você pode
  definir `CARGO_PROFILE_RELEASE_CODEGEN_UNITS=32` e
  `CARGO_PROFILE_RELEASE_LTO='false'` para deixar o compilador satisfeito ao
  mirar `i686-windows-*`. Aqui está um
  [exemplo](https://github.com/napi-rs/package-template/blob/50ecdec7c7d31c60b693d5d52be6e13ba9b32bf8/.github/workflows/CI.yaml#L89-L91).
