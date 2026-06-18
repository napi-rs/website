---
title: 'Artifacts'
description: napi artifacts command in @napi-rs/cli.
---

# Artifacts

Gerenciamento de [artifacts](https://docs.github.com/en/actions/advanced-guides/storing-workflow-data-as-artifacts) do GitHub Actions.

::: info
Este comando geralmente é usado na etapa de publicação, antes do comando `npm
  publish` e após a etapa de `Download artifacts`.
:::

## Flags List

| Flag          | Tipo/Valor padrão    | Descrição                                                                                           |
| ------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| `-d` ,`--dir` | `String`/`artifacts` | O diretório de origem que contém todos os resultados dos `artifacts` gerados na fase de compilação. |
| `--dist`      | `String`/`npm`       | O diretório de distribuição para onde o complemento nativo será copiado.                            |

## Como isso funciona

Suponha que você tenha um projeto que cria um complemento(addon) nativo para estas plataformas:

- `x86_64-apple-darwin`
- `x86_64-pc-windows-msvc`
- `x86_64-unknown-linux-gnu`
- `aarch64-apple-darwin`
- `aarch64-linux-android`
- `aarch64-unknown-linux-gnu`
- `aarch64-unknown-linux-musl`
- `aarch64-pc-windows-msvc`
- `armv7-unknown-linux-gnueabihf`
- `arm-linux-androideabi`
- `x86_64-unknown-linux-musl`
- `x86_64-unknown-freebsd`
- `i686-pc-windows-msvc`

E você pode baixar esses artefatos através de `actions/download-artifact`:

```yaml
- name: Download all artifacts
  uses: actions/download-artifact@v2
  with:
  	path: artifacts
```

Agora a estrutura de diretórios ficará assim:

**directory structure**

```text {4,6,8,10,12,14,16,18,20,22,24,26,28}
.
├── artifacts
|   ├── bindings-x86_64-apple-darwin
|   │   └── blake.darwin-x64.node
|   ├── bindings-x86_64-pc-windows-msvc
|   │   └── blake.win32-x64.node
|   ├── bindings-x86_64-unknown-linux-gnu
|   │   └── blake.linux-x64-gnu.node
|   ├── bindings-aarch64-apple-darwin
|   │   └── blake.darwin-arm64.node
|   ├── bindings-aarch64-linux-android
|   │   └── blake.android-arm64.node
|   ├── bindings-aarch64-unknown-linux-gnu
|   │   └── blake.linux-arm64-gnu.node
|   ├── bindings-aarch64-unknown-linux-musl
|   │   └── blake.linux-arm64-musl.node
|   ├── bindings-aarch64-pc-windows-msvc
|   │   └── blake.win32-arm64-msvc.node
|   ├── bindings-armv7-unknown-linux-gnueabihf
|   │   └── blake.linux-arm-gnueabihf.node
|   ├── bindings-arm-linux-androideabi
|   │   └── blake.android-arm-eabi.node
|   ├── bindings-x86_64-unknown-linux-musl
|   │   └── blake.linux-x64-musl.node
|   ├── bindings-x86_64-unknown-freebsd
|   │   └── blake.freebsd-x64.node
|   └── bindings-i686-pc-windows-msvc
|       └── blake.win32-ia32-msvc.node
├── npm
│   ├── android-arm-eabi
│   │   ├── README.md
│   │   └── package.json
│   ├── android-arm64
│   │   ├── README.md
│   │   └── package.json
│   ├── darwin-arm64
│   │   ├── README.md
│   │   └── package.json
│   ├── darwin-x64
│   │   ├── README.md
│   │   └── package.json
│   ├── freebsd-x64
│   │   ├── README.md
│   │   └── package.json
│   ├── linux-arm-gnueabihf
│   │   ├── README.md
│   │   └── package.json
│   ├── linux-arm64-gnu
│   │   ├── README.md
│   │   └── package.json
│   ├── linux-arm64-musl
│   │   ├── README.md
│   │   └── package.json
│   ├── linux-x64-gnu
│   │   ├── README.md
│   │   └── package.json
│   ├── linux-x64-musl
│   │   ├── README.md
│   │   └── package.json
│   ├── win32-arm64-msvc
│   │   ├── README.md
│   │   └── package.json
│   ├── win32-ia32-msvc
│   │   ├── README.md
│   │   └── package.json
│   └── win32-x64-msvc
│       ├── README.md
│       └── package.json
```

Como você pode ver, precisamos copiar todos os arquivos <span class="chalk-green">`.node`</span> para o diretório `npm` para que possamos publicá-los por meio do comando [`napi prepublish`](./pre-publish).

O comando `napi artifacts` fará esse trabalho para você. Suponha que as flags <span class="chalk-green">`-d`</span> e <span class="chalk-green">`--dist`</span> tenham o valor padrão, e a estrutura de diretórios seja a mesma que abaixo. Após a execução do comando `napi artifacts`, a estrutura de diretórios se tornará:

**directory structure**

```text {6,10,14,18,22,26,30,34,38,42,46,50,54}
.
├── artifacts
├── npm
│   ├── android-arm-eabi
│   │   ├── README.md
|   |   ├── blake.android-arm-eabi.node
│   │   └── package.json
│   ├── android-arm64
│   │   ├── README.md
|   |   ├── blake.android-arm64.node
│   │   └── package.json
│   ├── darwin-arm64
│   │   ├── README.md
|   |   ├── blake.darwin-arm64.node
│   │   └── package.json
│   ├── darwin-x64
│   │   ├── README.md
|   |   ├── blake.darwin-x64.node
│   │   └── package.json
│   ├── freebsd-x64
│   │   ├── README.md
|   |   ├── blake.freebsd-x64.node
│   │   └── package.json
│   ├── linux-arm-gnueabihf
│   │   ├── README.md
|   |   ├── blake.linux-arm-gnueabihf.node
│   │   └── package.json
│   ├── linux-arm64-gnu
│   │   ├── README.md
|   |   ├── blake.linux-arm64-gnu.node
│   │   └── package.json
│   ├── linux-arm64-musl
│   │   ├── README.md
|   |   ├── blake.linux-arm64-musl.node
│   │   └── package.json
│   ├── linux-x64-gnu
│   │   ├── README.md
|   |   ├── blake.linux-x64-gnu.node
│   │   └── package.json
│   ├── linux-x64-musl
│   │   ├── README.md
|   |   ├── blake.linux-x64-musl.node
│   │   └── package.json
│   ├── win32-arm64-msvc
│   │   ├── README.md
|   |   ├── blake.win32-arm64-msvc.node
│   │   └── package.json
│   ├── win32-ia32-msvc
│   │   ├── README.md
|   |   ├── blake.win32-ia32-msvc.node
│   │   └── package.json
│   └── win32-x64-msvc
│       ├── README.md
|       ├── blake.win32-x64-msvc.node
│       └── package.json
```
