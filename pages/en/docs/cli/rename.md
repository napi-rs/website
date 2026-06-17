---
description: napi rename command in @napi-rs/cli.
---

# Rename

Rename the **NAPI-RS** project

## Usage

```sh
# CLI
napi rename [--options]
```

```typescript
// Programmatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().rename({
  // options
})
```

## Options

| Options         | CLI Options         | type   | required | default                                       | description                                                                                                        |
| --------------- | ------------------- | ------ | -------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
|                 | --help,-h           |        |          |                                               | get help                                                                                                           |
| cwd             | --cwd               | string | false    | process.cwd()                                 | The working directory of where napi command will be executed in, all other paths options are relative to this path |
| configPath      | --config-path,-c    | string | false    |                                               | Path to <span class="chalk-green">napi</span> config json file                                                     |
| packageJsonPath | --package-json-path | string | false    | <span class="chalk-green">package.json</span> | Path to <span class="chalk-green">package.json</span>                                                              |
| npmDir          | --npm-dir           | string | false    | <span class="chalk-green">npm</span>          | Path to the folder where the npm packages put                                                                      |
| name            | --name,-n           | string | false    |                                               | The new name of the project                                                                                        |
| binaryName      | --binary-name,-b    | string | false    |                                               | The new binary name `*.node` files                                                                                 |
| packageName     | --package-name      | string | false    |                                               | The new package name of the project                                                                                |
| manifestPath    | --manifest-path     | string | false    | <span class="chalk-rust">Cargo.toml</span>    | Path to <span class="chalk-rust">Cargo.toml</span>                                                                 |
| repository      | --repository        | string | false    |                                               | The new repository of the project                                                                                  |
| description     | --description       | string | false    |                                               | The new description of the project                                                                                 |
