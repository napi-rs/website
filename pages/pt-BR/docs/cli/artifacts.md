---
title: 'Artifacts'
description: Coleta artefatos de build de CI nos pacotes de plataforma do napi-rs.
---

# Artifacts

`napi artifacts` localiza recursivamente arquivos `.node` e `.wasm` gerados,
valida seus nomes de binário e sufixos de target e os copia para os pacotes npm
correspondentes de cada plataforma. Os arquivos nativos também são copiados
para o diretório do pacote raiz para que o loader gerado consiga resolver um
binding local.

## Uso

```sh
napi artifacts [--options]
```

```ts
import { NapiCli } from '@napi-rs/cli'

await new NapiCli().artifacts({
  outputDir: 'artifacts',
  npmDir: 'npm',
})
```

## Opções

| Opção             | Sintaxe CLI           | Tipo     | Obrigatório | Padrão                                          | Descrição                                                                                                                                                  |
| ----------------- | --------------------- | -------- | :---------: | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cwd`             | `--cwd`               | `string` |     Não     | `process.cwd()`                                 | Diretório-base para configuração, pacote, artefatos baixados, pacotes npm e saídas de build.                                                               |
| `configPath`      | `--config-path,-c`    | `string` |     Não     |                                                 | Arquivo JSON de configuração do napi independente.                                                                                                         |
| `packageJsonPath` | `--package-json-path` | `string` |     Não     | <span class="chalk-green">`package.json`</span> | Pacote raiz que contém a configuração do napi.                                                                                                             |
| `outputDir`       | `--output-dir,-o,-d`  | `string` |     Não     | <span class="chalk-green">`./artifacts`</span>  | Diretório pesquisado recursivamente em busca dos arquivos `.node` e `.wasm` baixados. Isso corresponde ao caminho de download dos artefatos, não a `npm/`. |
| `npmDir`          | `--npm-dir`           | `string` |     Não     | <span class="chalk-green">`npm`</span>          | Diretório que contém os pacotes gerados de cada plataforma.                                                                                                |
| `buildOutputDir`  | `--build-output-dir`  | `string` |     Não     | `cwd`                                           | Diretório que contém os arquivos JavaScript WASI e worker gerados. Caminhos relativos partem de `--cwd`.                                                   |

Não existe a opção `--dist`. Use `--output-dir` para os artefatos de build
baixados e `--npm-dir` para os destinos dos pacotes de plataforma.

## Workflow de CI

Cada job de build deve enviar arquivos com o nome configurado do binário e o
ABI do target, por exemplo:

```text
cool.darwin-arm64.node
cool.linux-x64-gnu.node
cool.win32-x64-msvc.node
cool.wasm32-wasi.wasm
```

No job de coleta, crie os diretórios dos pacotes, baixe todos os artefatos e
depois faça a coleta:

```yaml
- name: Create platform packages
  run: yarn napi create-npm-dirs

- name: Download all build artifacts
  uses: actions/download-artifact@v8
  with:
    path: artifacts

- name: Move artifacts into packages
  run: yarn napi artifacts --output-dir artifacts --npm-dir npm
```

Normalmente, `actions/download-artifact` cria um diretório aninhado por
artefato enviado. A CLI pesquisa recursivamente, então estes dois layouts
funcionam:

```text
artifacts/
├── bindings-aarch64-apple-darwin/
│   └── cool.darwin-arm64.node
├── bindings-x86_64-unknown-linux-gnu/
│   └── cool.linux-x64-gnu.node
└── bindings-x86_64-pc-windows-msvc/
    └── cool.win32-x64-msvc.node
```

Depois da coleta:

```text
.
├── cool.darwin-arm64.node
├── cool.linux-x64-gnu.node
├── cool.win32-x64-msvc.node
└── npm/
    ├── darwin-arm64/cool.darwin-arm64.node
    ├── linux-x64-gnu/cool.linux-x64-gnu.node
    └── win32-x64-msvc/cool.win32-x64-msvc.node
```

## Regras de correspondência

Para cada arquivo encontrado, a CLI:

1. Separa do nome do arquivo o sufixo final delimitado por pontos, como
   `linux-x64-gnu`.
2. Exige que o nome-base restante seja igual a `napi.binaryName`. Um nome de
   binário diferente gera um aviso e é ignorado.
3. Encontra o pacote de target configurado cujo diretório corresponde a esse
   sufixo de plataforma. Um arquivo sem pacote de target faz o comando falhar,
   exceto binários de origem que são combinados intencionalmente em um binário
   universal configurado.
4. Grava o arquivo nesse pacote de target e no diretório do pacote raiz.

::: warning
O comando confia no sufixo do nome do arquivo. Ele não inspeciona o binário
nativo para comprovar sua arquitetura, libc, sistema operacional mínimo ou
nível de Node-API. Teste cada artefato no runtime que ele afirma suportar
antes de publicar.

:::

## Artefatos WASI

Quando `napi.targets` inclui um target WASI, `napi artifacts` também copia os
arquivos de suporte gerados para `npm/wasm32-wasi`:

- `<binaryName>.wasi.cjs`
- `<binaryName>.wasi-browser.js`
- `wasi-worker.mjs`
- `wasi-worker-browser.mjs`

Por padrão, esses arquivos são lidos a partir de `--cwd`. Passe
`--build-output-dir` quando a build WASI os tiver gravado em outro lugar; um
valor relativo parte de `--cwd`. O arquivo `.wasm` baixado continua sendo
localizado em `--output-dir`.

Depois de coletar e verificar todos os targets, [`napi pre-publish`](./pre-publish)
versiona e publica os pacotes de plataforma. `napi pre-publish` não copia
artefatos ausentes para você.
