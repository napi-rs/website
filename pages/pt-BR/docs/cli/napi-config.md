---
title: 'NAPI Config'
description: Config schema of NAPI-RS.
---

# NAPI Config

O esquema de configuração do **NAPI-RS**.

::: info
Todos os campos em `napi` são opcionais.
:::

## Schema

```ts
{
  napi?: {
    name?: string
    triples?: {
      defaults?: boolean,
      additional?: string[]
    },
    package?: {
      name?: string
    },
    npmClient?: string
  }
}
```

| Field                |                    Padrão                    | Descrição                                                                                                                                                                               |
| -------------------- | :------------------------------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`               |   <span class="chalk-green">`index`</span>   | O nome do arquivo binário do arquivo `.node` gerado. Ex: <span class="chalk-green">`[NAME].[TRIPLE?].node`</span> se torna <span class="chalk-green">`index.win32-x64-msvc.node`</span> |
| `triples.defaults`   |   <span class="chalk-green">`true`</span>    | Se deve habilitar os triples padrão. <br />Os triples padrão são `['x86_64-apple-darwin', 'x86_64-unknown-linux-gnu', 'x86_64-pc-windows-msvc']`.                                       |
| `triples.additional` |    <span class="chalk-green">`[]`</span>     | Triples adicionais além dos triplos padrão que você deseja construir. Triplos de destino(target) podem ser encontrados na saída do comando `rustup target list`.                        |
| `package.name`       | <span class="chalk-green">`undefined`</span> | Substitua o campo `name` no `package.json`. Veja [Build#js-package-name](./build#note-for---js-package-name) para uso.                                                                  |
| `npmClient`          |    <span class="chalk-green">`npm`</span>    | Especifique um cliente NPM diferente para uso ao executar ações do NPM, como publicação.                                                                                                |

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
