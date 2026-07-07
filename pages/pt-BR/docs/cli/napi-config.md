---
title: 'NAPI Config'
description: Config schema of NAPI-RS.
---

# NAPI Config

O esquema de configuração do **NAPI-RS**.

::: tip
Todos os campos em `napi` são opcionais.
:::

## Schema

```ts
{
  napi?: {
    binaryName?: string
    targets?: string[],
    packageName?: string,
    npmClient?: string
    constEnum?: boolean
    dtsHeader?: string
    dtsHeaderFile?: string
    wasm?: {
      initialMemory?: number
      maximumMemory?: number
      browser?: {
        fs?: boolean
        asyncInit?: boolean
      }
    }
  }
}
```

| Field                    |                     Padrão                      | Descrição                                                                                                                                                                                                                                                                                                               |
| ------------------------ | :---------------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `binaryName`             |    <span class="chalk-green">`index`</span>     | O nome do arquivo binário do arquivo `.node` gerado. Ex: <span class="chalk-green">`[NAME].[TRIPLE?].node`</span> se torna <span class="chalk-green">`index.win32-x64-msvc.node`</span>                                                                                                                                 |
| `targets`                |      <span class="chalk-green">`[]`</span>      | Os target triples para os quais o seu projeto é distribuído, usados para scaffolding e empacotamento. Defini-lo não faz o `napi build` compilar múltiplos targets — veja a nota abaixo para a única coisa que o `napi build` lê dele. Os target triples podem ser encontrados na saída do comando `rustup target list`. |
| `packageName`            |  <span class="chalk-green">`undefined`</span>   | Substitui o campo `name` no `package.json`. Veja [Build#js-package-name](./build#observa%C3%A7%C3%B5es-para---js-package-name) para o uso.                                                                                                                                                                              |
| `npmClient`              |     <span class="chalk-green">`npm`</span>      | Especifique um cliente NPM diferente para uso ao executar ações do NPM, como publicação.                                                                                                                                                                                                                                |
| `constEnum`              |    <span class="chalk-green">`false`</span>     | Se deve gerar `const enum` para o arquivo `index.d.ts` gerado.                                                                                                                                                                                                                                                          |
| `dtsHeader`              |  <span class="chalk-green">`undefined`</span>   | String de cabeçalho anexada ao início do arquivo `index.d.ts` gerado.                                                                                                                                                                                                                                                   |
| `dtsHeaderFile`          |  <span class="chalk-green">`undefined`</span>   | Caminho de um arquivo que contém a string de cabeçalho anexada ao início do arquivo `index.d.ts` gerado. Se tanto `dtsHeader` quanto `dtsHeaderFile` forem fornecidos, `dtsHeaderFile` será usado                                                                                                                       |
| `wasm.initialMemory`     | <span class="chalk-green">`4000` (256mb)</span> | Tamanho inicial de memória para o módulo WebAssembly gerado. Veja [WebAssembly.Memory](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory) para mais detalhes.                                                                                                                            |
| `wasm.maximumMemory`     | <span class="chalk-green">`65536` (4GiB)</span> | Tamanho máximo de memória para o módulo WebAssembly gerado. Veja [WebAssembly.Memory](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory) para mais detalhes.                                                                                                                             |
| `wasm.browser.fs`        |    <span class="chalk-green">`false`</span>     | Se deve habilitar o polyfill do módulo `node:fs` para o módulo WebAssembly gerado.                                                                                                                                                                                                                                      |
| `wasm.browser.asyncInit` |    <span class="chalk-green">`false`</span>     | Se deve habilitar a inicialização assíncrona para o módulo WebAssembly gerado.                                                                                                                                                                                                                                          |

::: info
`targets` guia o scaffolding e o empacotamento: `napi new` o usa para gerar
a matriz de CI, [`napi create-npm-dirs`](/docs/cli/create-npm-dirs) cria um pacote
npm por target e [`napi artifacts`](./artifacts) coleta os binários
compilados para esses targets. Defini-lo **não** faz o `napi build`
compilar múltiplos targets — `napi build` compila exatamente um target por
invocação, selecionado com a flag `--target` dele. A única coisa que o
`napi build` lê de `targets` é a entrada WASI: ele deriva o nome do arquivo
de binding `.wasm` a partir do target WASI listado ali, e deixa de emitir
os arquivos de binding WASI (`<binaryName>.wasi.cjs` e os arquivos
relacionados) por completo quando nenhum target WASI está listado. As flags
de compilação cruzada (`--use-napi-cross`, `--cross-compile`, `--use-cross`)
também não têm equivalente no arquivo de configuração: elas só podem ser
passadas na linha de comando do `napi build`.

:::

## O que é `target triple`

Veja [rustc/platform-support](https://doc.rust-lang.org/nightly/rustc/platform-support.html) e [LLVM/CrossCompilation](https://clang.llvm.org/docs/CrossCompilation.html#target-triple)

> Os Targets são identificados por seus "target triple", que é a string usada para informar ao compilador que tipo de saída deve ser produzida.

> O triplo tem o formato geral `<arch><sub>-<vendor>-<sys>-<abi>`, onde:
>
> - `arch` = `x86_64`, `i386`, `arm`, `thumb`, `mips`, etc.
> - `sub` = ex: no ARM: `v5`, `v6m`, `v7a`, `v7m`, etc.
> - `vendor` = `pc`, `apple`, `nvidia`, `ibm`, etc.
> - `sys` = `none`, `linux`, `win32`, `darwin`, `cuda`, etc.
> - `abi` = `eabi`, `gnu`, `android`, `macho`, `elf`, etc.

Depois que você souber quais triples distribui, veja [Compilação cruzada](../cross-build) para saber como compilar cada um deles a partir do seu host.
