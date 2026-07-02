---
title: 'Build'
description: napi build command in @napi-rs/cli.
---

# Build

Build the NAPI-RS project

## Usage

```sh
# CLI
napi build [--options]
```

```typescript
// Programmatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().build({
  // options
})
```

## Options

| Options           | CLI Options           | type     | required | default | description                                                                                                                                                                             |
| ----------------- | --------------------- | -------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                   | --help,-h             |          |          |         | get help                                                                                                                                                                                |
| target            | --target,-t           | string   | false    |         | Build for the target triple, bypassed to <span class="chalk-green">cargo build --target</span>                                                                                          |
| cwd               | --cwd                 | string   | false    |         | The working directory of where napi command will be executed in, all other paths options are relative to this path                                                                      |
| manifestPath      | --manifest-path       | string   | false    |         | Path to <span class="chalk-rust">Cargo.toml</span>                                                                                                                                      |
| configPath        | --config-path,-c      | string   | false    |         | Path to <span class="chalk-green">napi</span> config json file                                                                                                                          |
| packageJsonPath   | --package-json-path   | string   | false    |         | Path to <span class="chalk-green">package.json</span>                                                                                                                                   |
| targetDir         | --target-dir          | string   | false    |         | Directory for all crate generated artifacts, see <span class="chalk-green">cargo build --target-dir</span>                                                                              |
| outputDir         | --output-dir,-o       | string   | false    |         | Path to where all the built files would be put. Default to the crate folder                                                                                                             |
| platform          | --platform            | boolean  | false    |         | Add platform triple to the generated nodejs binding file, eg: <span class="chalk-green">[name].linux-x64-gnu.node</span>                                                                |
| jsPackageName     | --js-package-name     | string   | false    |         | Package name in generated js binding file. Only works with <span class="chalk-green">--platform</span> flag                                                                             |
| constEnum         | --const-enum          | boolean  | false    |         | Whether generate const enum for typescript bindings                                                                                                                                     |
| jsBinding         | --js                  | string   | false    |         | Path and filename of generated JS binding file. Only works with <span class="chalk-green">--platform</span> flag. Relative to <span class="chalk-green">--output-dir</span>.            |
| noJsBinding       | --no-js               | boolean  | false    |         | Whether to disable the generation JS binding file. Only works with <span class="chalk-green">--platform</span> flag.                                                                    |
| dts               | --dts                 | string   | false    |         | Path and filename of generated type def file. Relative to <span class="chalk-green">--output-dir</span>                                                                                 |
| dtsHeader         | --dts-header          | string   | false    |         | Custom file header for generated type def file. Only works when <span class="chalk-green">typedef</span> feature enabled.                                                               |
| noDtsHeader       | --no-dts-header       | boolean  | false    |         | Whether to disable the default file header for generated type def file. Only works when <span class="chalk-green">typedef</span> feature enabled.                                       |
| dtsCache          | --dts-cache           | boolean  | false    | true    | Whether to enable the dts cache, default to true                                                                                                                                        |
| esm               | --esm                 | boolean  | false    |         | Whether to emit an ESM JS binding file instead of CJS format. Only works with <span class="chalk-green">--platform</span> flag.                                                         |
| strip             | --strip,-s            | boolean  | false    |         | Whether strip the library to achieve the minimum file size                                                                                                                              |
| release           | --release,-r          | boolean  | false    |         | Build in release mode                                                                                                                                                                   |
| verbose           | --verbose,-v          | boolean  | false    |         | Verbosely log build command trace                                                                                                                                                       |
| bin               | --bin                 | string   | false    |         | Build only the specified binary                                                                                                                                                         |
| package           | --package,-p          | string   | false    |         | Build the specified library or the one at cwd                                                                                                                                           |
| profile           | --profile             | string   | false    |         | Build artifacts with the specified profile                                                                                                                                              |
| crossCompile      | --cross-compile,-x    | boolean  | false    |         | [experimental] cross-compile for the specified target with <span class="chalk-green">cargo-xwin</span> on windows and <span class="chalk-green">cargo-zigbuild</span> on other platform |
| useCross          | --use-cross           | boolean  | false    |         | [experimental] use <span class="chalk-green">cross</span> instead of <span class="chalk-green">cargo</span>                                                                             |
| useNapiCross      | --use-napi-cross      | boolean  | false    |         | [experimental] use <span class="chalk-green">@napi-rs/cross-toolchain</span> to cross-compile Linux arm/arm64/x64 gnu targets.                                                          |
| watch             | --watch,-w            | boolean  | false    |         | watch the crate changes and build continuously with <span class="chalk-green">cargo-watch</span> crates                                                                                 |
| features          | --features,-F         | string[] | false    |         | Space-separated list of features to activate                                                                                                                                            |
| allFeatures       | --all-features        | boolean  | false    |         | Activate all available features                                                                                                                                                         |
| noDefaultFeatures | --no-default-features | boolean  | false    |         | Do not activate the <span class="chalk-green">default</span> feature                                                                                                                    |

## Passing flags to Cargo

Flags after `--` will be passed through to the cargo build command. For example:

```sh
napi build -- --locked
```

This will pass the `--locked` flag to `cargo build`, resulting in `cargo build --locked`.

## Note for `--js-package-name`

In the [Deep dive section](../introduction/getting-started#deep-dive), we recommended you publish your package under [`npm scope`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/). But if you are migrating an existed package which is not under the [`npm scope`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) or you just don't want your package under an [`npm scope`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) , you may trigger the [_npm spam detection_](https://stackoverflow.com/questions/48668389/npm-publish-failed-with-package-name-triggered-spam-detection/54135900#54135900) while publishing the native platform packages. Like `snappy-darwin-x64` `snappy-darwin-arm64` etc...

In this case, you can publish your platform packages under [`npm scope`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) to avoid the [_npm spam detection_](https://stackoverflow.com/questions/48668389/npm-publish-failed-with-package-name-triggered-spam-detection/54135900#54135900). And your users don't need to care about the platform native packages in `optionalDependencies`. Like [`snappy`](https://github.com/Brooooooklyn/snappy/), users only need to install it via `yarn add snappy`. But platform native packages are under `@napi-rs` scope:

```json
{
  "name": "snappy",
  "version": "7.0.0",
  "optionalDependencies": {
    "@napi-rs/snappy-win32-x64-msvc": "7.0.0",
    "@napi-rs/snappy-darwin-x64": "7.0.0",
    "@napi-rs/snappy-linux-x64-gnu": "7.0.0",
    "@napi-rs/snappy-linux-x64-musl": "7.0.0",
    "@napi-rs/snappy-linux-arm64-gnu": "7.0.0",
    "@napi-rs/snappy-win32-ia32-msvc": "7.0.0",
    "@napi-rs/snappy-linux-arm-gnueabihf": "7.0.0",
    "@napi-rs/snappy-darwin-arm64": "7.0.0",
    "@napi-rs/snappy-android-arm64": "7.0.0",
    "@napi-rs/snappy-android-arm-eabi": "7.0.0",
    "@napi-rs/snappy-freebsd-x64": "7.0.0",
    "@napi-rs/snappy-linux-arm64-musl": "7.0.0",
    "@napi-rs/snappy-win32-arm64-msvc": "7.0.0"
  }
}
```

For this case, `@napi-rs/cli` provides the `--js-package-name` to override generated package loading logic. For example in `snappy` we have <span class="chalk-green">package.json</span> like this:

```json
{
  "name": "snappy",
  "version": "7.0.0",
  "napi": {
    "name": "snappy"
  }
}
```

Without the `--js-package-name` flag, `@napi-rs/cli` will generate JavaScript binding to load platform native packages for you:

**index.js**

```js {10,22}
switch (platform) {
  case 'darwin':
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(join(__dirname, 'snappy.darwin-x64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./snappy.darwin-x64.node')
          } else {
            nativeBinding = require('snappy-darwin-x64')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm64':
        localFileExisted = existsSync(join(__dirname, 'snappy.darwin-arm64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./snappy.darwin-arm64.node')
          } else {
            nativeBinding = require('snappy-darwin-arm64')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on macOS: ${arch}`)
    }
    break
    ...
}
```

This isn't what we want. So build it with `--js-package-name` to override the `package name` in generated JavaScript binding file: `napi build --release --platform --js-package-name @napi-rs/snappy`. Then the generated JavaScript file will become:

**index.js**

```js {10,22}
switch (platform) {
  case 'darwin':
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(join(__dirname, 'snappy.darwin-x64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./snappy.darwin-x64.node')
          } else {
            nativeBinding = require('@napi-rs/snappy-darwin-x64')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm64':
        localFileExisted = existsSync(join(__dirname, 'snappy.darwin-arm64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./snappy.darwin-arm64.node')
          } else {
            nativeBinding = require('@napi-rs/snappy-darwin-arm64')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on macOS: ${arch}`)
    }
    break
    ...
}
```
