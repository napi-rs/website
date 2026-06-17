---
description: napi pre-publish command in @napi-rs/cli.
---

# Pre Publish

Update package.json and copy addons into per platform packages

## Usage

```sh
# CLI
napi pre-publish [--options]
```

```typescript
// Programmatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().prePublish({
  // options
})
```

## Options

For boolean options, you can [prefix `no-`](https://mael.dev/clipanion/docs/options#booleans) to turn off the option, e.g. `--no-gh-release`.

| Options         | CLI Options               | type                                                                           | required | default                                       | description                                                                                                        |
| --------------- | ------------------------- | ------------------------------------------------------------------------------ | -------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
|                 | --help,-h                 |                                                                                |          |                                               | get help                                                                                                           |
| cwd             | --cwd                     | string                                                                         | false    | process.cwd()                                 | The working directory of where napi command will be executed in, all other paths options are relative to this path |
| configPath      | --config-path,-c          | string                                                                         | false    |                                               | Path to <span class="chalk-green">napi</span> config json file                                                     |
| packageJsonPath | --package-json-path       | string                                                                         | false    | <span class="chalk-green">package.json</span> | Path to <span class="chalk-green">package.json</span>                                                              |
| npmDir          | --npm-dir,-p              | string                                                                         | false    | <span class="chalk-green">npm</span>          | Path to the folder where the npm packages put                                                                      |
| tagStyle        | --tag-style,--tagstyle,-t | <span class="chalk-green">npm</span> \| <span class="chalk-green">lerna</span> | false    | <span class="chalk-green">lerna</span>        | git tag style, <span class="chalk-green">npm</span> or <span class="chalk-green">lerna</span>                      |
| ghRelease       | --gh-release              | boolean                                                                        | false    | true                                          | Whether create GitHub release                                                                                      |
| ghReleaseName   | --gh-release-name         | string                                                                         | false    |                                               | GitHub release name                                                                                                |
| ghReleaseId     | --gh-release-id           | string                                                                         | false    |                                               | Existing GitHub release id                                                                                         |
| dryRun          | --dry-run                 | boolean                                                                        | false    | false                                         | Dry run without touching file system                                                                               |

::: info
This command is usually used in `prepublishOnly` lifecycle scripts in
`package.json`.
:::

**package.json**

```json {2}
"scripts": {
  "prepublishOnly": "napi prepublish -t npm"
}
```
