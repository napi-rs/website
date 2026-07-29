---
title: 'Universalize'
description: napi universalize command in @napi-rs/cli.
---

# Universalize

Combine built binaries into one universal binary

## When you need this

On macOS, `napi universalize` combines the separate `x86_64` (Intel) and
`aarch64` (Apple Silicon) `.node` binaries into a single universal binary with
`lipo`. You need it only when you ship a `darwin-universal` target: your
`napi.targets` config must contain a universal-arch target for the current
platform, and both per-arch binaries must already be built. It currently runs
on macOS only.

In the release pipeline this command sits between `napi build` (run once per
macOS architecture) and [`napi artifacts`](./artifacts). See [Release native
packages](/docs/deep-dive/release) for the complete pipeline.

## Usage

```sh
# CLI
napi universalize [--options]
```

```typescript
// Programmatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().universalize({
  // options
})
```

## Examples

A typical macOS CI job: build both architectures, then combine them:

```sh
napi build --release --target x86_64-apple-darwin
napi build --release --target aarch64-apple-darwin
napi universalize
```

Combine binaries that were written to a custom output directory (must match
the `--output-dir` used by `napi build`):

```sh
napi universalize --output-dir ./binaries
```

## Options

| Options         | CLI Options         | type   | required | default                                       | description                                                                                                                                                 |
| --------------- | ------------------- | ------ | -------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                 | --help,-h           |        |          |                                               | get help                                                                                                                                                    |
| cwd             | --cwd               | string | false    | process.cwd()                                 | The working directory of where napi command will be executed in, all other paths options are relative to this path                                          |
| configPath      | --config-path,-c    | string | false    |                                               | Path to <span class="chalk-green">napi</span> config json file                                                                                              |
| packageJsonPath | --package-json-path | string | false    | <span class="chalk-green">package.json</span> | Path to <span class="chalk-green">package.json</span>                                                                                                       |
| outputDir       | --output-dir,-o     | string | false    | <span class="chalk-green">./</span>           | Path to the folder where all built <span class="chalk-green">.node</span> files put, same as <span class="chalk-green">--output-dir</span> of build command |
