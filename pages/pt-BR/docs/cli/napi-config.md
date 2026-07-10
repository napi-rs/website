---
title: 'Configuração NAPI'
description: Configure builds NAPI-RS, bindings gerados, targets e saída WASI.
---

# Configuração NAPI

Coloque a configuração sob a chave `napi` do `package.json`:

**package.json**

```json
{
  "name": "@scope/addon",
  "napi": {
    "binaryName": "addon",
    "targets": ["x86_64-unknown-linux-gnu", "aarch64-apple-darwin"]
  }
}
```

Comandos que expõem `--config-path` também podem ler um arquivo JSON separado.
Quando as duas fontes existem, a configuração separada tem precedência. Todos
os campos fornecidos pelo usuário são opcionais.

## Esquema

```ts
{
  napi?: {
    binaryName?: string
    targets?: string[]
    packageName?: string
    npmClient?: string
    constEnum?: boolean
    runtimeStringEnum?: boolean
    dtsHeader?: string
    dtsHeaderFile?: string
    wasm?: {
      initialMemory?: number
      maximumMemory?: number
      browser?: {
        fs?: boolean
        asyncInit?: boolean
        buffer?: boolean
        errorEvent?: boolean
      }
    }
  }
}
```

## Campos e padrões efetivos

| Campo                     |                      Padrão                      | Descrição                                                                                                                                                                                                                                             |
| ------------------------- | :----------------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `binaryName`              |     <span class="chalk-green">`index`</span>     | Nome-base dos arquivos nativos e WASI gerados. Uma build de plataforma produz um nome como <span class="chalk-green">`index.win32-x64-msvc.node`</span>.                                                                                              |
| `targets`                 |      <span class="chalk-green">`[]`</span>       | Target triples que o projeto empacota e publica. Isso não representa um comando de build para vários targets.                                                                                                                                         |
| `packageName`             |          `name` do `package.json` raiz           | Nome do pacote usado pelos loaders gerados e pelos nomes dos pacotes de plataforma. Sobrescreva-o quando o nome do pacote JavaScript for diferente dos metadados do pacote raiz; veja [Build: nome do pacote JS](./build#note-for---js-package-name). |
| `npmClient`               |      <span class="chalk-green">`npm`</span>      | Comando usado nas operações npm, como publicar cada pacote de plataforma.                                                                                                                                                                             |
| `constEnum`               |     <span class="chalk-green">`true`</span>      | Gera declarações TypeScript `const enum`. O padrão efetivo da geração de tipos é `true` quando nem a configuração nem a CLI o sobrescrevem.                                                                                                           |
| `runtimeStringEnum`       |     <span class="chalk-green">`false`</span>     | Com `constEnum: false`, emite `#[napi(string_enum)]` como um `enum` de runtime em vez de uma união de strings apenas de tipos. Não tem efeito enquanto `constEnum` for `true`.                                                                        |
| `dtsHeader`               |   <span class="chalk-green">`undefined`</span>   | String adicionada no início do arquivo de declarações gerado.                                                                                                                                                                                         |
| `dtsHeaderFile`           |   <span class="chalk-green">`undefined`</span>   | Caminho, relativo ao diretório de trabalho do comando, cujo conteúdo é adicionado ao início do arquivo de declarações. Tem precedência sobre `dtsHeader`.                                                                                             |
| `wasm.initialMemory`      | <span class="chalk-green">`4000` páginas</span>  | Memória WebAssembly compartilhada inicial, aproximadamente 250 MiB.                                                                                                                                                                                   |
| `wasm.maximumMemory`      | <span class="chalk-green">`65536` páginas</span> | Memória WebAssembly compartilhada máxima, 4 GiB.                                                                                                                                                                                                      |
| `wasm.browser.fs`         |     <span class="chalk-green">`false`</span>     | Inclui o sistema de arquivos em memória e seu proxy nos bindings WASI do navegador.                                                                                                                                                                   |
| `wasm.browser.asyncInit`  |     <span class="chalk-green">`false`</span>     | Usa o caminho de instanciação assíncrona de módulo do emnapi no binding para navegador.                                                                                                                                                               |
| `wasm.browser.buffer`     |     <span class="chalk-green">`false`</span>     | Importa `Buffer` e o injeta no contexto emnapi usado pelo binding para navegador.                                                                                                                                                                     |
| `wasm.browser.errorEvent` |     <span class="chalk-green">`false`</span>     | Encaminha falhas de workers para um `CustomEvent` `napi-rs-worker-error` no navegador, incluindo a saída de erro capturada do worker.                                                                                                                 |

Uma página de memória WebAssembly tem 64 KiB. As configurações de memória são
gravadas nos loaders WASI gerados para Node e navegador; não são limites de
memória do Cargo.

::: info
`runtimeStringEnum: true` exige `constEnum: false`. As opções equivalentes da
build são `--runtime-string-enum --no-const-enum`.

:::

## O que `targets` controla

`targets` orienta o empacotamento:

- [`napi create-npm-dirs`](./create-npm-dirs) cria um diretório npm por target.
- [`napi artifacts`](./artifacts) move os arquivos compilados para esses diretórios.
- [`napi pre-publish`](./pre-publish) versiona e publica esses pacotes.
- Um target WASI habilita a geração de `<binaryName>.wasi.cjs` e dos arquivos
  relacionados para navegador e worker.

Definir `targets` **não** faz `napi build` compilar cada entrada. Cada execução
da build produz um target, selecionado por `--target`, `CARGO_BUILD_TARGET` ou
pelo padrão do host. Da mesma forma, as opções de compilação cruzada
(`--use-napi-cross`, `--cross-compile` e `--use-cross`) não têm equivalente na
configuração.

A lista de targets também não cria jobs de CI arbitrários. `napi new` filtra os
jobs que já existem no template escolhido. Ao adicionar outro target aceito,
adicione o job de build e valide seu runtime separadamente. Consulte [Suporte e
compatibilidade](/pt-BR/docs/more/support-compatibility) e [Compilação
cruzada](../cross-build).

## Campos v2 descontinuados

A CLI ainda lê estes campos por compatibilidade, mas projetos novos não devem
usá-los:

| Descontinuado                                       | Substituição      |
| --------------------------------------------------- | ----------------- |
| `napi.name`                                         | `napi.binaryName` |
| `napi.triples.defaults` e `napi.triples.additional` | `napi.targets`    |

O normalizador de configuração v3 **não** lê o campo aninhado antigo
`napi.package.name`. Mova esse valor explicitamente para `napi.packageName`.

## O que é um target triple?

Consulte [suporte de plataformas do Rust](https://doc.rust-lang.org/nightly/rustc/platform-support.html)
e [compilação cruzada do LLVM](https://clang.llvm.org/docs/CrossCompilation.html#target-triple).
Um target triple descreve arquitetura, fornecedor, sistema operacional e ABI do
artefato, por exemplo:

```text
x86_64-unknown-linux-gnu
└─ arch  └ vendor └ system └ ABI
```

Depois de decidir quais triples pretende distribuir, use [Compilação
cruzada](../cross-build) para escolher e validar o mecanismo de build de cada um.
