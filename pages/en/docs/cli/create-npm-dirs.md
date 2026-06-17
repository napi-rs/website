---
description: napi create-npm-dirs command in @napi-rs/cli.
---

# Create Npm Dirs

Create npm package dirs for different platforms

## Usage

```sh
# CLI
napi create-npm-dirs [--options]
```

```typescript
// Programmatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().createNpmDirs({
  // options
})
```

## Options

| Options         | CLI Options         | type    | required | default                                       | description                                                                                                        |
| --------------- | ------------------- | ------- | -------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
|                 | --help,-h           |         |          |                                               | get help                                                                                                           |
| cwd             | --cwd               | string  | false    | process.cwd()                                 | The working directory of where napi command will be executed in, all other paths options are relative to this path |
| configPath      | --config-path,-c    | string  | false    |                                               | Path to <span class="chalk-green">napi</span> config json file                                                     |
| packageJsonPath | --package-json-path | string  | false    | <span class="chalk-green">package.json</span> | Path to <span class="chalk-green">package.json</span>                                                              |
| npmDir          | --npm-dir           | string  | false    | <span class="chalk-green">npm</span>          | Path to the folder where the npm packages put                                                                      |
| dryRun          | --dry-run           | boolean | false    | false                                         | Dry run without touching file system                                                                               |
