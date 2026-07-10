---
title: 'Universalizar'
description: Comando napi universalize do @napi-rs/cli.
---

# Universalizar

Combina os binários compilados em um único binário universal.

## Uso

```sh
# CLI
napi universalize [--options]
```

```typescript
// Programaticamente
import { NapiCli } from '@napi-rs/cli'

new NapiCli().universalize({
  // opções
})
```

## Opções

| Opção           | Opção da CLI        | Tipo   | Obrigatória | Padrão                                        | Descrição                                                                                                                                                                 |
| --------------- | ------------------- | ------ | ----------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                 | --help,-h           |        |             |                                               | Exibe a ajuda.                                                                                                                                                            |
| cwd             | --cwd               | string | false       | process.cwd()                                 | Diretório de trabalho em que o comando napi será executado. Todos os demais caminhos relativos partem deste diretório.                                                    |
| configPath      | --config-path,-c    | string | false       |                                               | Caminho para o arquivo JSON de configuração <span class="chalk-green">napi</span>.                                                                                        |
| packageJsonPath | --package-json-path | string | false       | <span class="chalk-green">package.json</span> | Caminho para o <span class="chalk-green">package.json</span>.                                                                                                             |
| outputDir       | --output-dir,-o     | string | false       | <span class="chalk-green">./</span>           | Pasta que contém os arquivos <span class="chalk-green">.node</span> compilados; deve ser a mesma usada em <span class="chalk-green">--output-dir</span> no comando build. |
