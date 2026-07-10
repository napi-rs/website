---
title: 'Pré-publicação'
description: Versione, publique e anexe pacotes de plataforma napi-rs com segurança.
---

# Pré-publicação

`napi pre-publish` (também disponível como `napi prepublish`) prepara e publica
os pacotes de cada plataforma usando a versão atual do pacote raiz. Ele também
pode criar uma release no GitHub e enviar os binários nativos como assets.

::: warning
Por padrão, este comando causa efeitos colaterais na rede e no registry. Não
é uma prévia do empacotamento: ele pode publicar várias versões npm imutáveis
antes de o pacote raiz ser publicado. Execute-o apenas em um job de release
controlado.

:::

O comando **não** coleta nem copia artefatos de build. Execute [`napi
artifacts`](./artifacts) antes.

## Uso

```sh
napi pre-publish [--options]
```

```ts
import { NapiCli } from '@napi-rs/cli'

await new NapiCli().prePublish({
  tagStyle: 'npm',
  ghRelease: true,
})
```

Opções booleanas aceitam o prefixo `--no-`. Por exemplo, use
`--no-gh-release` quando a release não for executada no GitHub.

## Opções

| Opção                 | Sintaxe da CLI              | Tipo           | Obrigatória | Padrão                                          | Descrição                                                                                                                                              |
| --------------------- | --------------------------- | -------------- | :---------: | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cwd`                 | `--cwd`                     | `string`       |     Não     | `process.cwd()`                                 | Diretório de trabalho. Todos os outros caminhos relativos partem daqui.                                                                                |
| `configPath`          | `--config-path,-c`          | `string`       |     Não     |                                                 | Arquivo JSON separado de configuração napi.                                                                                                            |
| `packageJsonPath`     | `--package-json-path`       | `string`       |     Não     | <span class="chalk-green">`package.json`</span> | Metadados e versão de release do pacote raiz.                                                                                                          |
| `npmDir`              | `--npm-dir,-p`              | `string`       |     Não     | <span class="chalk-green">`npm`</span>          | Diretório que contém um pacote preparado para cada target configurado.                                                                                 |
| `tagStyle`            | `--tag-style,--tagstyle,-t` | `npm \| lerna` |     Não     | <span class="chalk-green">`lerna`</span>        | Forma de resolver a tag da release no GitHub. `npm` usa `v<versão do pacote>`; `lerna` lê a tag do pacote no commit de release mais recente.           |
| `ghRelease`           | `--gh-release`              | `boolean`      |     Não     | `true`                                          | Cria/localiza uma release no GitHub e envia os binários dos targets quando há metadados de repositório GitHub.                                         |
| `ghReleaseName`       | `--gh-release-name`         | `string`       |     Não     |                                                 | Nome enviado ao criar a release no GitHub.                                                                                                             |
| `ghReleaseId`         | `--gh-release-id`           | `string`       |     Não     |                                                 | ID numérico de uma release existente que receberá os assets. Nenhuma release nova é criada.                                                            |
| `skipOptionalPublish` | `--skip-optional-publish`   | `boolean`      |     Não     | `false`                                         | Não executa o comando publish do gerenciador para os pacotes de plataforma. Atualizações de metadados e uploads de assets habilitados ainda acontecem. |
| `dryRun`              | `--dry-run`                 | `boolean`      |     Não     | `false`                                         | Ignora alterações nos arquivos, publicação npm, criação de release e upload de assets.                                                                 |

## Efeitos colaterais exatos

Sem `--dry-run`, o comando executa estas etapas em ordem:

1. Lê o pacote raiz e a configuração napi.
2. Define a `version` de cada pacote de plataforma configurado como a versão raiz.
3. Mescla em `optionalDependencies` do pacote raiz uma entrada de versão exata
   para cada pacote de plataforma configurado. Entradas existentes são
   preservadas, inclusive pacotes de targets obsoletos.
4. Com releases GitHub habilitadas, resolve os metadados pelo último commit Git
   e por `GITHUB_REPOSITORY`; então cria a release, a menos que
   `--gh-release-id` escolha uma existente.
5. Para cada target cujo arquivo `.node` ou `.wasm` esperado exista no diretório
   npm, executa `<npmClient> publish`, salvo se `--skip-optional-publish` estiver
   definido.
6. Com releases GitHub habilitadas, envia o arquivo do target como asset.

Um arquivo esperado ausente gera um aviso e é ignorado; isso não encerra o
comando com erro. Falhas ao criar releases ou enviar assets são registradas e
podem não impedir a publicação npm. Portanto, a CI deve verificar por conta
própria o conjunto completo de artefatos e o estado externo final.

`napi pre-publish` nunca publica o pacote raiz. No template gerado, ele roda em
`prepublishOnly`; quando termina com sucesso, a operação `npm publish` ao redor
dele publica o pacote raiz.

## Estado exigido para a release

Antes de executar com credenciais reais, confirme todos os itens:

- A versão do `package.json` raiz é final e nunca foi publicada.
- `repository` aponta para o repositório GitHub real. A proveniência npm valida
  a identidade do repositório e do workflow.
- `napi.targets` contém exatamente os pacotes destinados a esta release.
- As `optionalDependencies` existentes foram revisadas. O comando adiciona ou
  atualiza targets configurados, mas não remove entradas de plataforma obsoletas.
- [`napi create-npm-dirs`](./create-npm-dirs) criou cada pacote de target.
- [`napi artifacts`](./artifacts) colocou cada binário esperado tanto no pacote
  do target quanto no workspace raiz.
- Cada target passou em um teste de runtime no ambiente que declara suportar.
- O cliente npm configurado está autenticado para o pacote raiz e todos os
  pacotes de target.
- `GITHUB_TOKEN`, `GITHUB_REPOSITORY` e `contents: write` estão disponíveis
  quando releases GitHub estão habilitadas.
- O workflow tem `id-token: write` e a proveniência npm está habilitada quando
  se espera que a release inclua proveniência.

No workflow de pacote único gerado, use o estilo de tag npm:

**package.json**

```json
{
  "scripts": {
    "prepublishOnly": "napi prepublish -t npm"
  }
}
```

O estilo `lerna` padrão serve apenas para um commit de release do Lerna cujo
corpo liste a tag do pacote que será publicado.

## Faça uma prévia com segurança {#preview-safely}

Execute diretamente o modo dry-run do comando:

```sh
DEBUG=napi:* yarn napi prepublish -t npm --dry-run
```

Isso confirma que a configuração e os metadados da release Git podem ser
lidos, mas não verifica a presença dos binários nem testa a autorização do
registry.

Para inspecionar o tarball npm sem disparar o script `prepublishOnly` real,
desabilite explicitamente os scripts de ciclo de vida:

```sh
npm pack --dry-run --ignore-scripts
```

::: danger
Não use `npm publish --dry-run` como substituto de segurança. O npm ainda pode
executar scripts de ciclo de vida, e um `prepublishOnly` contendo `napi
  prepublish` pode publicar os pacotes de plataforma com credenciais reais.

:::

## Falha parcial e recuperação {#partial-failure-and-recovery}

A release não é transacional. O npm não permite sobrescrever uma combinação de
nome e versão publicada, e este comando não pode reverter pacotes já existentes.

Se uma execução falhar:

1. Interrompa tentativas automáticas até saber quais pacotes e assets existem.
2. Verifique cada target com `npm view <package>@<version> version`, confira o
   pacote raiz separadamente e inspecione os assets da release no GitHub.
3. Mantenha os mesmos artefatos de build. Nunca publique bits diferentes sob
   uma versão que já exista para outro target.
4. Execute novamente a mesma versão para publicar os targets ausentes. A CLI
   reconhece o erro padrão do npm para versões já publicadas e ignora esses
   pacotes; outros erros do registry ainda fazem a execução falhar.
5. Passe `--gh-release-id <id>` para reutilizar uma release GitHub existente ou
   `--no-gh-release` se os assets forem gerenciados em outro lugar.
6. Use `--skip-optional-publish` somente depois de confirmar que **todos** os
   pacotes de plataforma existem. A opção não valida essa condição.

Se todos os pacotes de plataforma existirem, mas a publicação raiz falhar,
publique o tarball raiz inalterado a partir do job confiável com scripts de
ciclo de vida desabilitados, por exemplo `npm publish --ignore-scripts --access
public`. Preserve a mesma configuração de proveniência. Se o pacote raiz já foi
publicado enquanto um pacote de plataforma está ausente, publique o pacote
faltante imediatamente ou descontinue a versão raiz quebrada; o npm não oferece
rollback atômico.

Consulte [Publicar pacotes nativos](/docs/deep-dive/release) para o runbook
completo de CI.
