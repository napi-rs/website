---
title: 'Novo projeto'
description: Crie um projeto napi-rs a partir do template mantido para Yarn ou pnpm.
---

# Novo projeto

`napi new` cria um projeto a partir de um template externo mantido, renomeia o
pacote e o crate Rust, filtra os targets e jobs de CI, grava uma faixa de engine
do Node.js derivada do nível de Node-API selecionado e aplica a licença e as
configurações de geração de tipos.

::: warning
O Git precisa estar instalado e o GitHub deve estar acessível. O destino não
pode ser um arquivo existente nem um diretório que já contenha arquivos.

:::

## Uso

A CLI é interativa por padrão:

```sh
napi new <path>
```

O caminho pode ser omitido; nesse caso, o primeiro prompt solicita esse valor.
Use `--no-interactive` para automação:

```sh
napi new cool \
  --name @scope/cool \
  --min-node-api 8 \
  --targets x86_64-unknown-linux-gnu \
  --targets aarch64-apple-darwin \
  --no-interactive
```

Chamadas programáticas nunca abrem prompts. Informe `path` e quaisquer valores
que não sejam os padrões de forma explícita:

```ts
import { NapiCli } from '@napi-rs/cli'

await new NapiCli().new({
  path: 'cool',
  name: '@scope/cool',
  packageManager: 'pnpm',
  targets: ['x86_64-unknown-linux-gnu', 'aarch64-apple-darwin'],
})
```

## Prompts interativos

Quando `--interactive` está habilitado, o comando pergunta o nome do pacote, o
nível mínimo de Node-API, os targets, a licença, se deve gerar declarações
TypeScript e se deve configurar o GitHub Actions. Passe `--package-manager pnpm`
antes dos prompts se quiser o template pnpm; o gerenciador de pacotes não é uma
pergunta interativa.

## Opções

Opções booleanas aceitam o prefixo `--no-`, como `--no-interactive`,
`--no-enable-type-def` e `--no-enable-github-actions`.

| Opção                  | Sintaxe da CLI                            | Tipo           |               Obrigatória                | Padrão                       | Descrição                                                                                                                        |
| ---------------------- | ----------------------------------------- | -------------- | :--------------------------------------: | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `path`                 | <span class="chalk-green">`<path>`</span> | `string`       | Sim para uso não interativo/programático |                              | Diretório de destino vazio, resolvido a partir do diretório de trabalho atual.                                                   |
| `interactive`          | `--interactive,-i`                        | `boolean`      |                   Não                    | `true`                       | Solicita as informações do projeto. Esta opção existe apenas na CLI; use `--no-interactive` em automações.                       |
| `name`                 | `--name,-n`                               | `string`       |                   Não                    | nome do diretório de destino | Nome do pacote no `package.json`. Nomes com escopo são recomendados para publicação.                                             |
| `minNodeApiVersion`    | `--min-node-api,-v`                       | `number`       |                   Não                    | `4`                          | Nível mínimo de Node-API usado tanto no requisito de versão do Node.js do pacote gerado quanto na feature da dependência `napi`. |
| `packageManager`       | `--package-manager`                       | `yarn \| pnpm` |                   Não                    | `yarn`                       | Seleciona o template mantido para Yarn ou pnpm. O próprio template fixa a versão do gerenciador.                                 |
| `license`              | `--license,-l`                            | `string`       |                   Não                    | `MIT`                        | Licença gravada no `package.json`.                                                                                               |
| `targets`              | `--targets,-t`                            | `string[]`     |                   Não                    | `[]`                         | Target triples que serão mantidos. Repita a opção para vários targets.                                                           |
| `enableDefaultTargets` | `--enable-default-targets`                | `boolean`      |                   Não                    | `true`                       | No modo não interativo, usa o conjunto padrão quando `targets` está vazio.                                                       |
| `enableAllTargets`     | `--enable-all-targets`                    | `boolean`      |                   Não                    | `false`                      | Seleciona todos os targets aceitos pela CLI. Isso não cria jobs de CI ausentes no template.                                      |
| `enableTypeDef`        | `--enable-type-def`                       | `boolean`      |                   Não                    | `true`                       | Mantém a feature `type-def` e as declarações TypeScript geradas.                                                                 |
| `enableGithubActions`  | `--enable-github-actions`                 | `boolean`      |                   Não                    | `true`                       | Mantém e filtra o workflow do GitHub Actions do template.                                                                        |
| `testFramework`        | `--test-framework`                        | `string`       |                   Não                    | `ava`                        | Framework de testes solicitado. Atualmente, os templates implementam apenas AVA.                                                 |
| `dryRun`               | `--dry-run`                               | `boolean`      |                   Não                    | `false`                      | Valida opções, disponibilidade do Git e destino sem clonar nem gravar o projeto.                                                 |

`napi new` grava a feature `napiN` selecionada em `Cargo.toml` e a faixa de
Node.js correspondente em `package.json#engines.node`. Outras features Cargo
podem implicar um nível de Node-API maior; por isso, revise o conjunto final de
features ao adicionar integrações assíncronas ou outras integrações opcionais.

## Templates e cache

As únicas seleções de template compatíveis são:

| Valor  | Repositório                                                                         |
| ------ | ----------------------------------------------------------------------------------- |
| `yarn` | [`napi-rs/package-template`](https://github.com/napi-rs/package-template)           |
| `pnpm` | [`napi-rs/package-template-pnpm`](https://github.com/napi-rs/package-template-pnpm) |

A CLI armazena os templates em `~/.napi-rs/template/<package-manager>/repo`.
Em uma execução posterior, ela busca o repositório e redefine o cache para
`origin/main` antes de copiá-lo. O diretório `.git` do template não é copiado
para o novo projeto.

## Selecionar um target não garante suporte

O prompt lista todos os target triples que a CLI reconhece. O workflow gerado
só consegue manter linhas da matriz que já existam no template escolhido, e a
lista `napi.targets` gerada só consegue manter targets presentes na configuração
do pacote daquele template. Portanto, um target adicional aceito pode exigir
configuração manual, criação de diretórios npm, CI e testes de runtime.

Leia [Suporte e compatibilidade](/docs/more/support-compatibility) antes de usar
`--enable-all-targets` e siga [Adicionar um target a um projeto
existente](/docs/cross-build#add-a-target-to-an-existing-project) para ver o
fluxo completo.
