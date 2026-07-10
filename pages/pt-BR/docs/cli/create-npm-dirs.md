---
title: 'Criar diretórios npm'
description: Comando napi create-npm-dirs do @napi-rs/cli.
---

# Criar diretórios npm

Cria os diretórios dos pacotes npm para diferentes plataformas.

## Uso

```sh
# CLI
napi create-npm-dirs [--options]
```

```typescript
// Programaticamente
import { NapiCli } from '@napi-rs/cli'

new NapiCli().createNpmDirs({
  // opções
})
```

## Opções

| Opção           | Opção da CLI        | Tipo    | Obrigatória | Padrão                                        | Descrição                                                                                                              |
| --------------- | ------------------- | ------- | ----------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
|                 | --help,-h           |         |             |                                               | Exibe a ajuda.                                                                                                         |
| cwd             | --cwd               | string  | false       | process.cwd()                                 | Diretório de trabalho em que o comando napi será executado. Todos os demais caminhos relativos partem deste diretório. |
| configPath      | --config-path,-c    | string  | false       |                                               | Caminho para o arquivo JSON de configuração <span class="chalk-green">napi</span>.                                     |
| packageJsonPath | --package-json-path | string  | false       | <span class="chalk-green">package.json</span> | Caminho para o <span class="chalk-green">package.json</span>.                                                          |
| npmDir          | --npm-dir           | string  | false       | <span class="chalk-green">npm</span>          | Caminho da pasta em que os pacotes npm serão criados.                                                                  |
| dryRun          | --dry-run           | boolean | false       | false                                         | Simula a operação sem alterar o sistema de arquivos.                                                                   |
