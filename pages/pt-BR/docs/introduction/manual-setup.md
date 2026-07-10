---
title: 'Configuração manual'
description: Adicione NAPI-RS a um crate Rust, pacote JavaScript ou workspace existente sem usar um template.
---

# Configuração manual

Use este guia quando você já tiver um crate Rust ou pacote JavaScript, precisar
de um projeto mínimo, ou quiser colocar os pacotes Rust e JavaScript em partes
diferentes de um monorepo. Se você está começando um pacote independente e quer
o workflow completo de release, [`napi new`](/pt-BR/docs/cli/new) geralmente é mais
rápido.

A CLI é uma ferramenta de build e empacotamento. Seu addon continua sendo um
crate Cargo comum, então você pode usar o layout de workspace e o gerenciador
de pacotes que já possui.

## Pré-requisitos

Instale uma toolchain Rust atual, Node.js 22.13+ (ou Node.js 24+) para a CLI
atual e a CLI do NAPI-RS no pacote JavaScript que controla o addon:

```sh
rustc --version
node --version
npm install --save-dev @napi-rs/cli@^3
```

Manter a CLI local faz com que as builds locais e a CI usem a versão registrada
pelo projeto. Execute-a por um script de pacote ou por `npx napi`; uma
instalação global não é necessária.

## Projeto mínimo

O menor layout útil é:

```text
my-addon/
├── Cargo.toml
├── build.rs
├── package.json
├── src/
│   └── lib.rs
└── test.cjs
```

### Configure o Cargo

A biblioteca precisa ser um `cdylib`: o Node carrega a biblioteca compartilhada
resultante em vez de vinculá-la a outro executável Rust. `napi-build` configura
a saída para a plataforma host, e as features padrão de `napi-derive`
habilitam validação estrita de macros e geração de definições TypeScript.

**Cargo.toml**

```toml
[package]
name = "my-addon-native"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
napi = "3"
napi-derive = "3"

[build-dependencies]
napi-build = "2"
```

Crie o script de build:

**build.rs**

```rust
fn main() {
  napi_build::setup();
}
```

### Exporte uma função Rust

**src/lib.rs**

```rust
use napi_derive::napi;

#[napi]
pub fn add(left: i32, right: i32) -> i32 {
  left + right
}
```

### Configure o pacote JavaScript

`binaryName` controla o nome do arquivo gerado. `--platform` adiciona o sufixo
da plataforma atual e gera um loader que seleciona o binário local ou o pacote
opcional de plataforma correspondente.

**package.json**

```json
{
  "name": "my-addon",
  "version": "0.1.0",
  "main": "index.js",
  "types": "index.d.ts",
  "scripts": {
    "build": "napi build --platform",
    "build:release": "napi build --platform --release",
    "test": "node --test test.cjs"
  },
  "napi": {
    "binaryName": "my-addon"
  },
  "devDependencies": {
    "@napi-rs/cli": "^3"
  }
}
```

Compile e chame o addon:

**test.cjs**

```js
const assert = require('node:assert/strict')
const test = require('node:test')

const { add } = require('./index.js')

test('adds two numbers', () => {
  assert.equal(add(2, 3), 5)
})
```

```sh
npm run build
npm test
```

Uma build de depuração produz estes arquivos no diretório do crate por padrão:

```text
index.d.ts
index.js
my-addon.<platform-arch-abi>.node
```

O arquivo `.node` é a biblioteca nativa. Importe `index.js`, e não um arquivo
de plataforma codificado manualmente: o loader gerado também lida com seleção
de libc, pacotes de plataforma publicados separadamente e um fallback WASI
opcional.

::: info
Sem `--platform`, a CLI copia um único arquivo `my-addon.node`, mas não gera
o loader JavaScript. Isso é útil para experimentos de baixo nível; pacotes
publicados normalmente devem usar `--platform`.

:::

## Variações comuns

### Funções assíncronas

Habilite a feature `async` quando uma `async fn` Rust exportada precisar se
transformar em um `Promise` JavaScript:

**Cargo.toml**

```toml
[dependencies]
napi = { version = "3", features = ["async"] }
napi-derive = "3"
tokio = { version = "1", features = ["fs"] }
```

Veja [Assíncrono e concorrência](/pt-BR/docs/more/async-concurrency) antes de
escolher entre Tokio, `AsyncTask`, ThreadsafeFunction e streams.

### Um diretório de saída personalizado

Todos os caminhos são relativos a `--cwd`. Coloque os arquivos JavaScript,
TypeScript e nativos gerados em um pacote JavaScript com:

```sh
napi build --platform --output-dir ./dist
```

Mantenha o loader e seu arquivo `.node` local juntos. Mover apenas `index.js`
quebra a resolução relativa dele.

### Um arquivo de configuração separado

Por padrão, a CLI lê o objeto `napi` de `package.json`. Você pode mover esse
objeto para um JSON e passar `--config-path`; quando ambos existem, o arquivo
separado vence.

**napi.config.json**

```json
{
  "binaryName": "my-addon",
  "packageName": "@scope/my-addon",
  "targets": [
    "x86_64-unknown-linux-gnu",
    "aarch64-apple-darwin",
    "x86_64-pc-windows-msvc"
  ]
}
```

```sh
napi build --platform --config-path napi.config.json
```

`targets` descreve os artefatos que você pretende empacotar. Uma build local
ainda compila um target por vez; passe `--target <rust-triple>`
explicitamente na CI.

## Workspaces Cargo e JavaScript

O crate Rust e o pacote JavaScript não precisam compartilhar um diretório. Por
exemplo:

```text
workspace/
├── Cargo.toml                 # [workspace] members = ["crates/native"]
├── crates/
│   └── native/
│       ├── Cargo.toml         # package.name = "my-addon-native"
│       ├── build.rs
│       └── src/lib.rs
└── packages/
    └── addon/
        └── package.json       # controla a configuração napi e a saída gerada
```

Execute a CLI a partir da raiz do workspace deixando todos os caminhos
explícitos:

```sh
napi build \
  --cwd packages/addon \
  --manifest-path ../../Cargo.toml \
  --package my-addon-native \
  --package-json-path package.json \
  --output-dir . \
  --platform
```

A distinção importante é:

| Opção                 | Seleciona                                                     |
| --------------------- | ------------------------------------------------------------- |
| `--cwd`               | Diretório-base para todos os outros caminhos relativos        |
| `--manifest-path`     | `Cargo.toml` do crate ou workspace usado por `cargo metadata` |
| `--package`           | Nome exato do pacote Cargo a compilar dentro de um workspace  |
| `--package-json-path` | Pacote JavaScript e configuração do NAPI-RS                   |
| `--output-dir`        | Destino dos arquivos `.node`, loader e `.d.ts`                |

Se o manifest aponta para um workspace Cargo virtual, `--package` é
obrigatório. Caso contrário, a CLI não consegue saber qual membro `cdylib`
controla o addon.

## Prepare para distribuir

Para uma única máquina local, o loader gerado e o arquivo `.node` são
suficientes. Um pacote multiplataforma publicado normalmente usa um pacote npm
opcional separado para cada target:

1. Adicione todos os release triples a `napi.targets`.
2. Compile um artefato `--platform --release --target <triple>` por job de CI.
3. Execute [`napi create-npm-dirs`](/pt-BR/docs/cli/create-npm-dirs).
4. Baixe os artefatos da CI e execute [`napi artifacts`](/pt-BR/docs/cli/artifacts).
5. Siga o [guia de release](/pt-BR/docs/deep-dive/release) e leia todos os efeitos
   colaterais de [`napi pre-publish`](/pt-BR/docs/cli/pre-publish) antes de publicar.

Não publique um binário compilado na sua máquina de desenvolvimento como se ele
desse suporte a outros sistemas operacionais. Use o [guia de compilação
cruzada](/pt-BR/docs/cross-build) e teste o pacote final em cada runtime que você
afirma suportar.

## O que ler em seguida

- [Testes e depuração](/pt-BR/docs/more/testing-debugging)
- [Integrações com aplicações e bundlers](/pt-BR/docs/more/integrations)
- [Solução de problemas](/pt-BR/docs/more/troubleshooting)
- [Configuração do NAPI-RS](/pt-BR/docs/cli/napi-config)
