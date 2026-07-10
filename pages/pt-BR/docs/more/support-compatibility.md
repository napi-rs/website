---
title: Suporte e compatibilidade
description: Entenda a compatibilidade ABI do Node-API, os runtimes testados e os targets de build do napi-rs.
---

# Suporte e compatibilidade

“Suportado” pode significar várias coisas diferentes para um addon nativo. O
napi-rs mantém esses limites separados:

| Pergunta                                                         | Fonte da verdade                                                                                                        |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Um addon compilado pode carregar em uma versão do Node.js?       | O nível de Node-API compilado nesse addon e as versões de Node-API fornecidas pelo runtime.                             |
| `@napi-rs/cli` pode ser executado?                               | O requisito de engine Node.js do próprio pacote da CLI.                                                                 |
| Uma combinação de Node/runtime é testada continuamente?          | O workflow de CI atual do código-fonte do napi-rs.                                                                      |
| `napi new` gera um caminho de build e publicação para um target? | A matriz versionada do template Yarn ou pnpm selecionado e `napi.targets`.                                              |
| O Rust consegue compilar o target triple?                        | O suporte do target no Rust mais o linker, SDK, dependências nativas e mecanismo de compilação cruzada exigidos.        |
| O Node.js upstream publica um binário para o target?             | Os artefatos de release do Node.js, que são mais limitados do que os triples que a CLI do napi-rs consegue interpretar. |

Um target triple aceito ou um nível de Node-API ABI-compatível, por si só, não
é uma promessa de que todas as combinações acima sejam testadas.

## Compatibilidade ABI do Node-API

O Node-API fornece estabilidade de ABI entre versões do Node.js. Um binário
nativo compilado contra o nível `N` de Node-API em geral consegue carregar em
versões posteriores do Node.js que ainda ofereçam o nível `N`, sem precisar
recompilar para cada major do Node.

Essa garantia não cobre:

- APIs introduzidas depois do nível de Node-API selecionado.
- Compatibilidade de sistema operacional, CPU, libc, runtime C++ ou target
  mínimo de deployment.
- Bugs na implementação de Node-API de um runtime alternativo.
- Bibliotecas nativas vinculadas pelas suas próprias dependências.

`napi new` pergunta o nível mínimo de Node-API e grava tanto a feature Cargo
`napiN` correspondente quanto a faixa de `engines.node` no projeto gerado. O
scaffold atualmente oferece níveis de Node-API de 1 a 9 e usa o nível 4 por
padrão. Escolha o menor nível que forneça as APIs que você usa e então teste no
runtime Node.js mais antigo que você afirma suportar. Features como suporte
assíncrono ainda podem elevar o piso efetivo de Node-API.

## Requisitos de CLI e Rust {#cli-and-rust-requirements}

- `@napi-rs/cli` declara `>=23.5.0 || ^22.13.0 || ^20.17.0`, em conformidade
  com sua dependência de prompts interativos. Use uma release **Node.js 22 LTS
  atualizada (22.13+) ou Node.js 24+** nas builds atuais da CLI. Um addon ainda
  pode ter como alvo um runtime Node.js compatível mais antigo, mesmo que a CLI
  que o compila não consiga rodar nele.
- O workspace atual do napi-rs v3 declara **Rust 1.88** como sua versão mínima
  de Rust.
- O `engines.node` do template gerado descreve o pacote do addon, não a CLI de
  build.

## O que o repositório-fonte do napi-rs testa

A [matriz principal de CI do código-fonte do
napi-rs](https://github.com/napi-rs/napi-rs/blob/main/.github/workflows/test-release.yaml)
atualmente exercita **Node.js 22, 24 e 26** em seus principais jobs de Linux,
macOS e Windows. Testes adicionais de targets Docker atualmente usam Node.js 22
e 24.

Esta é a cobertura atual de regressão do projeto, não o intervalo completo de
compatibilidade do Node-API. Uma versão do Node fora dessa matriz pode ser
ABI-compatível, mas não é correto dizer que ela é continuamente testada pelo
workflow-fonte atual.

Os templates de pacote gerados mantêm suas próprias matrizes de teste menores.
Leia o workflow copiado para o seu projeto e trate esse arquivo versionado como
o contrato de suporte do seu pacote.

## Runtimes JavaScript

| Runtime                       | Status                                                                                                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Addons nativos no Node.js** | Runtime principal. Ainda assim, as afirmações de release devem se limitar às versões de Node e plataformas que seu pacote efetivamente testa.                                                                                            |
| **Addons nativos no Bun**     | Melhor esforço. O repositório-fonte executa um job com a versão mais recente do Bun, mas a etapa de teste usa `continue-on-error`, então falhas no Bun não bloqueiam releases do napi-rs. Teste seu addon real antes de afirmar suporte. |
| **Addons nativos no Deno**    | Não faz parte da matriz atual de CI do repositório-fonte do napi-rs. Não deduza suporte a Deno apenas da compatibilidade do Node-API.                                                                                                    |
| **Fallback WASI no Node.js**  | Exercitado pelos workflows do código-fonte e dos templates gerados para as versões de Node selecionadas. Trata-se de um artefato e loader diferentes de um addon nativo `.node`.                                                         |
| **WASI no navegador**         | Disponível por meio de bindings gerados para browser/worker. Exige threads em WebAssembly, workers e os cabeçalhos corretos de isolamento cross-origin. Teste explicitamente os navegadores alvo.                                        |
| **Fallback WASI em Bun/Deno** | Ainda há lacunas conhecidas de compatibilidade; veja [napi-rs issue #2965](https://github.com/napi-rs/napi-rs/issues/2965). Não apresente esse caminho como geralmente suportado.                                                        |

::: info
Um pacote pode oferecer suporte a um runtime de forma mais forte do que o
próprio napi-rs, desde que adicione seus próprios testes de runtime
bloqueantes. Registre esses testes na política de suporte do pacote em vez de
depender da homepage do framework.

:::

## Targets aceitos pela CLI

A CLI atual reconhece famílias de targets que incluem:

- macOS x64, arm64 e binários universais.
- Windows MSVC x64, x86 e arm64, além de Windows GNU x64.
- Linux glibc x64, arm64, armv7, loongarch64, riscv64gc, ppc64le e s390x.
- Linux musl x64, arm64 e armv7.
- Android arm64 e armv7.
- FreeBSD x64.
- OpenHarmony x64 e arm64.
- targets WASI preview-1 com threads.

Esta lista descreve o vocabulário de parsing e empacotamento. Alguns targets
exigem um linker ou SDK instalado manualmente, alguns só podem ser compilados a
partir de hosts específicos, e alguns não têm binários oficiais de runtime do
Node.js.

## Targets gerados por `napi new`

`napi new` copia um de dois repositórios mantidos:

- [Template de pacote Yarn](https://github.com/napi-rs/package-template)
- [Template de pacote pnpm](https://github.com/napi-rs/package-template-pnpm)

O scaffold filtra linhas já existentes do template; ele não sintetiza uma nova
receita de CI para cada triple aceito. Os templates atuais fornecem caminhos de
build/pacote para a matriz comum:

| Plataforma   | Targets cobertos pelo template |
| ------------ | ------------------------------ |
| macOS        | x64, arm64                     |
| Windows MSVC | x64, x86, arm64                |
| Linux glibc  | x64, arm64, armv7              |
| Linux musl   | x64, arm64                     |
| Android      | arm64, armv7                   |
| FreeBSD      | x64                            |
| WASI         | target preview-1 com threads   |

Os dois templates mantidos atualmente implementam essa matriz. Como `napi new`
filtra a configuração versionada neles em vez de sintetizar receitas por
target, trate `package.json` e `.github/workflows/CI.yml` gerados como a base de
suporte do novo pacote.

Targets como OpenHarmony, Windows GNU, armv7 musl, macOS universal,
loongarch64, riscv64gc, ppc64le e s390x podem ser aceitos pela CLI sem ter um
caminho completo de build e publicação no scaffold. Selecionar todos os targets
não muda isso.

## Adicionando ou declarando suporte a um target

Antes de listar um target como suportado:

1. Adicione o triple a `napi.targets`.
2. Execute `napi create-npm-dirs` e inspecione as restrições dos pacotes
   gerados.
3. Adicione uma build de CI com o host, linker/SDK e modo de compilação cruzada
   corretos.
4. Envie e colete o artefato com `napi artifacts`.
5. Execute o binário no ambiente-alvo real ou fielmente emulado.
6. Teste o SO, libc, target de deployment e versão do Node.js mais antigos que
   você afirma suportar.
7. Verifique que uma instalação limpa do pacote raiz seleciona e carrega o
   pacote opcional esperado.

Use [Compilação cruzada](/docs/cross-build) para a árvore de decisão entre host
e target e [Adicionar um target a um projeto
existente](/docs/cross-build#add-a-target-to-an-existing-project) para o fluxo
completo de empacotamento.

## Como declarar suporte com precisão

Prefira uma afirmação como:

> Um binário por plataforma listada, compilado contra Node-API 8. A CI testa
> Node.js 22 e 24 em macOS arm64/x64, Windows x64 e Linux x64 glibc/musl.
> Espera-se que outras versões do Node.js compatíveis com Node-API funcionem,
> mas elas não fazem parte da matriz bloqueante.

Evite “todas as versões do Node” ou “todas as plataformas”. Inclua o nível de
Node-API, as versões de Node testadas, a matriz SO/CPU/libc, o piso mínimo de
SO ou glibc, e se runtimes alternativos são bloqueantes, de melhor esforço ou
não testados.
