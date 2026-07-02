---
title: 'Artifacts'
description: napi artifacts command in @napi-rs/cli.
---

# Artifacts

Copy artifacts from Github Actions into npm packages and ready to publish

## Usage

```sh
# CLI
napi artifacts [--options]
```

```typescript
// Programatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().artifacts({
  // options
})
```

## Options

| Options         | CLI Options         | type   | required | default        | description                                                                                                                                                 |
| --------------- | ------------------- | ------ | -------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                 | --help,-h           |        |          |                | get help                                                                                                                                                    |
| cwd             | --cwd               | string | false    | process.cwd()  | The working directory of where napi command will be executed in, all other paths options are relative to this path                                          |
| configPath      | --config-path,-c    | string | false    |                | Path to <span class="chalk-green">napi</span> config json file                                                                                              |
| packageJsonPath | --package-json-path | string | false    | 'package.json' | Path to <span class="chalk-green">package.json</span>                                                                                                       |
| outputDir       | --output-dir,-o,-d  | string | false    | './artifacts'  | Path to the folder where all built <span class="chalk-green">.node</span> files put, same as <span class="chalk-green">--output-dir</span> of build command |
| npmDir          | --npm-dir           | string | false    | 'npm'          | Path to the folder where the npm packages put                                                                                                               |
| buildOutputDir  | --build-output-dir  | string | false    |                | Path to the build output dir, only needed when targets contains <span class="chalk-green">wasm32-wasi-\*</span>                                             |

## How does it work

Assume you have a project which builds native addon for these platform:

- `x86_64-apple-darwin`
- `x86_64-pc-windows-msvc`
- `x86_64-unknown-linux-gnu`
- `aarch64-apple-darwin`
- `aarch64-linux-android`
- `aarch64-unknown-linux-gnu`
- `aarch64-unknown-linux-musl`
- `aarch64-pc-windows-msvc`
- `armv7-unknown-linux-gnueabihf`
- `arm-linux-androideabi`
- `x86_64-unknown-linux-musl`
- `x86_64-unknown-freebsd`
- `i686-pc-windows-msvc`

And you can download these artifacts via `actions/download-artifact`:

```yaml
- name: Download all artifacts
  uses: actions/download-artifact@v2
  with:
  	path: artifacts
```

Now the directory structure will look like this:

**directory structure**

```text {4,6,8,10,12,14,16,18,20,22,24,26,28}
.
├── artifacts
|   ├── bindings-x86_64-apple-darwin
|   │   └── blake.darwin-x64.node
|   ├── bindings-x86_64-pc-windows-msvc
|   │   └── blake.win32-x64.node
|   ├── bindings-x86_64-unknown-linux-gnu
|   │   └── blake.linux-x64-gnu.node
|   ├── bindings-aarch64-apple-darwin
|   │   └── blake.darwin-arm64.node
|   ├── bindings-aarch64-linux-android
|   │   └── blake.android-arm64.node
|   ├── bindings-aarch64-unknown-linux-gnu
|   │   └── blake.linux-arm64-gnu.node
|   ├── bindings-aarch64-unknown-linux-musl
|   │   └── blake.linux-arm64-musl.node
|   ├── bindings-aarch64-pc-windows-msvc
|   │   └── blake.win32-arm64-msvc.node
|   ├── bindings-armv7-unknown-linux-gnueabihf
|   │   └── blake.linux-arm-gnueabihf.node
|   ├── bindings-arm-linux-androideabi
|   │   └── blake.android-arm-eabi.node
|   ├── bindings-x86_64-unknown-linux-musl
|   │   └── blake.linux-x64-musl.node
|   ├── bindings-x86_64-unknown-freebsd
|   │   └── blake.freebsd-x64.node
|   └── bindings-i686-pc-windows-msvc
|       └── blake.win32-ia32-msvc.node
├── npm
│   ├── android-arm-eabi
│   │   ├── README.md
│   │   └── package.json
│   ├── android-arm64
│   │   ├── README.md
│   │   └── package.json
│   ├── darwin-arm64
│   │   ├── README.md
│   │   └── package.json
│   ├── darwin-x64
│   │   ├── README.md
│   │   └── package.json
│   ├── freebsd-x64
│   │   ├── README.md
│   │   └── package.json
│   ├── linux-arm-gnueabihf
│   │   ├── README.md
│   │   └── package.json
│   ├── linux-arm64-gnu
│   │   ├── README.md
│   │   └── package.json
│   ├── linux-arm64-musl
│   │   ├── README.md
│   │   └── package.json
│   ├── linux-x64-gnu
│   │   ├── README.md
│   │   └── package.json
│   ├── linux-x64-musl
│   │   ├── README.md
│   │   └── package.json
│   ├── win32-arm64-msvc
│   │   ├── README.md
│   │   └── package.json
│   ├── win32-ia32-msvc
│   │   ├── README.md
│   │   └── package.json
│   └── win32-x64-msvc
│       ├── README.md
│       └── package.json
```

As you can see, we need to copy all <span class="chalk-green">`.node`</span> files into the `npm` directory so that we can publish them via the [`napi prepublish`](./pre-publish) command.

`napi artifacts` command will do this job for you. Assume the <span class="chalk-green">`-d`</span> flag and <span class="chalk-green">`--dist`</span> flags are the default value, and the directory structure is the same as below. After `napi artifacts` command run, the directory structure will become:

**directory structure**

```text {6,10,14,18,22,26,30,34,38,42,46,50,54}
.
├── artifacts
├── npm
│   ├── android-arm-eabi
│   │   ├── README.md
|   |   ├── blake.android-arm-eabi.node
│   │   └── package.json
│   ├── android-arm64
│   │   ├── README.md
|   |   ├── blake.android-arm64.node
│   │   └── package.json
│   ├── darwin-arm64
│   │   ├── README.md
|   |   ├── blake.darwin-arm64.node
│   │   └── package.json
│   ├── darwin-x64
│   │   ├── README.md
|   |   ├── blake.darwin-x64.node
│   │   └── package.json
│   ├── freebsd-x64
│   │   ├── README.md
|   |   ├── blake.freebsd-x64.node
│   │   └── package.json
│   ├── linux-arm-gnueabihf
│   │   ├── README.md
|   |   ├── blake.linux-arm-gnueabihf.node
│   │   └── package.json
│   ├── linux-arm64-gnu
│   │   ├── README.md
|   |   ├── blake.linux-arm64-gnu.node
│   │   └── package.json
│   ├── linux-arm64-musl
│   │   ├── README.md
|   |   ├── blake.linux-arm64-musl.node
│   │   └── package.json
│   ├── linux-x64-gnu
│   │   ├── README.md
|   |   ├── blake.linux-x64-gnu.node
│   │   └── package.json
│   ├── linux-x64-musl
│   │   ├── README.md
|   |   ├── blake.linux-x64-musl.node
│   │   └── package.json
│   ├── win32-arm64-msvc
│   │   ├── README.md
|   |   ├── blake.win32-arm64-msvc.node
│   │   └── package.json
│   ├── win32-ia32-msvc
│   │   ├── README.md
|   |   ├── blake.win32-ia32-msvc.node
│   │   └── package.json
│   └── win32-x64-msvc
│       ├── README.md
|       ├── blake.win32-x64-msvc.node
│       └── package.json
```
