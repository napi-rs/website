---
title: 'Create Npm Dirs'
description: napi create-npm-dirs command in @napi-rs/cli.
---

# Create Npm Dirs

Create npm package dirs for different platforms

## When you need this

`napi create-npm-dirs` creates one `npm/<platform-arch-abi>` directory per
entry of the `napi.targets` config, each containing a ready-to-publish
`package.json` for that platform's package. Committing these directories is no
longer recommended; create them in CI instead. You need this command before
[`napi artifacts`](./artifacts) can copy built binaries into the platform
packages, and before [`napi pre-publish`](./pre-publish) can publish them.

In the release pipeline this command sits after the platform `napi build`
jobs and before `napi artifacts`. See [Release native
packages](/docs/deep-dive/release) for the complete pipeline.

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

## Examples

Create the platform package directories in a CI release job:

```sh
napi create-npm-dirs
```

Preview which directories and files would be created, without touching the
file system:

```sh
napi create-npm-dirs --dry-run
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
