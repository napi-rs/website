---
description: napi new command in @napi-rs/cli.
---

# New

Create a new project with pre-configured boilerplate

::: info
The `napi new` command requires `git` to be installed, and it will clone the repository from the GitHub, be sure you can access the GitHub.
:::

## Usage

```sh
# CLI
napi new <path> [--options]
```

```typescript
// Programmatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().new({
  // options
})
```

## Options

| Options              | CLI Options                               | type     | required | default                               | description                                                                                                     |
| -------------------- | ----------------------------------------- | -------- | -------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
|                      | --help,-h                                 |          |          |                                       | get help                                                                                                        |
| path                 | <span class="chalk-green">\<path\></span> | false    | string   |                                       | The path where the NAPI-RS project will be created.                                                             |
| name                 | --name,-n                                 | string   | false    |                                       | The name of the project, default to the name of the directory if not provided                                   |
| minNodeApiVersion    | --min-node-api,-v                         | number   | false    | 4                                     | The minimum Node-API version to support                                                                         |
| packageManager       | --package-manager                         | string   | false    | <span class="chalk-green">yarn</span> | The package manager to use. Only support yarn 4.x for now.                                                      |
| license              | --license,-l                              | string   | false    | <span class="chalk-green">MIT</span>  | License for open-sourced project                                                                                |
| targets              | --targets,-t                              | string[] | false    | []                                    | All targets the crate will be compiled for.                                                                     |
| enableDefaultTargets | --enable-default-targets                  | boolean  | false    | true                                  | Whether enable default targets                                                                                  |
| enableAllTargets     | --enable-all-targets                      | boolean  | false    | false                                 | Whether enable all targets                                                                                      |
| enableTypeDef        | --enable-type-def                         | boolean  | false    | true                                  | Whether enable the <span class="chalk-green">type-def</span> feature for typescript definitions auto-generation |
| enableGithubActions  | --enable-github-actions                   | boolean  | false    | true                                  | Whether generate preconfigured GitHub Actions workflow                                                          |
| testFramework        | --test-framework                          | string   | false    | <span class="chalk-green">ava</span>  | The JavaScript test framework to use, only support <span class="chalk-green">ava</span> for now                 |
| dryRun               | --dry-run                                 | boolean  | false    | false                                 | Whether to run the command in dry-run mode                                                                      |
