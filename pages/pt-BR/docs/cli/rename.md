---
title: 'Renomear'
description: Comando napi rename do @napi-rs/cli.
---

# Renomear

Renomeia o projeto **NAPI-RS**.

## Uso

```sh
# CLI
napi rename [--options]
```

```typescript
// Programaticamente
import { NapiCli } from '@napi-rs/cli'

new NapiCli().rename({
  // opções
})
```

## Opções

| Opção           | Opção da CLI        | Tipo   | Obrigatória | Padrão                                        | Descrição                                                                                                              |
| --------------- | ------------------- | ------ | ----------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
|                 | --help,-h           |        |             |                                               | Exibe a ajuda.                                                                                                         |
| cwd             | --cwd               | string | false       | process.cwd()                                 | Diretório de trabalho em que o comando napi será executado. Todos os demais caminhos relativos partem deste diretório. |
| configPath      | --config-path,-c    | string | false       |                                               | Caminho para o arquivo JSON de configuração <span class="chalk-green">napi</span>.                                     |
| packageJsonPath | --package-json-path | string | false       | <span class="chalk-green">package.json</span> | Caminho para o <span class="chalk-green">package.json</span>.                                                          |
| npmDir          | --npm-dir           | string | false       | <span class="chalk-green">npm</span>          | Caminho da pasta em que ficam os pacotes npm.                                                                          |
| name            | --name,-n           | string | false       |                                               | Novo nome do projeto.                                                                                                  |
| binaryName      | --binary-name,-b    | string | false       |                                               | Novo nome do binário para os arquivos `*.node`.                                                                        |
| packageName     | --package-name      | string | false       |                                               | Novo nome do pacote do projeto.                                                                                        |
| manifestPath    | --manifest-path     | string | false       | <span class="chalk-rust">Cargo.toml</span>    | Caminho para o <span class="chalk-rust">Cargo.toml</span>.                                                             |
| repository      | --repository        | string | false       |                                               | Novo repositório do projeto.                                                                                           |
| description     | --description       | string | false       |                                               | Nova descrição do projeto.                                                                                             |
