---
title: 'Version'
description: napi version command in @napi-rs/cli.
---

# Version

Update version in created npm packages

## When you need this

`napi version` copies the `version` field of your root `package.json` into the
`package.json` of every per-platform package created by
[`napi create-npm-dirs`](./create-npm-dirs). You need it when your release
flow versions the platform packages as a separate step, for example when the
`npm/` directories are committed or inspected before publishing. If you run
[`napi pre-publish`](./pre-publish) directly, it already performs this version
sync for you.

In the release pipeline this command sits after `napi create-npm-dirs` and
before `napi pre-publish`. See [Release native packages](/docs/deep-dive/release)
for the complete pipeline.

## Usage

```sh
# CLI
napi version [--options]
```

```typescript
// Programmatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().version({
  // options
})
```

## Examples

Sync the root version into all platform packages in the default `npm/` directory:

```sh
napi version
```

A typical CI release job, after the platform binaries have been built:

```sh
napi create-npm-dirs
napi artifacts
napi version
```

## Options

| Options         | CLI Options         | type   | required | default                                       | description                                                                                                        |
| --------------- | ------------------- | ------ | -------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
|                 | --help,-h           |        |          |                                               | get help                                                                                                           |
| cwd             | --cwd               | string | false    | process.cwd()                                 | The working directory of where napi command will be executed in, all other paths options are relative to this path |
| configPath      | --config-path,-c    | string | false    |                                               | Path to <span class="chalk-green">napi</span> config json file                                                     |
| packageJsonPath | --package-json-path | string | false    | <span class="chalk-green">package.json</span> | Path to <span class="chalk-green">package.json</span>                                                              |
| npmDir          | --npm-dir           | string | false    | <span class="chalk-green">npm</span>          | Path to the folder where the npm packages put                                                                      |
