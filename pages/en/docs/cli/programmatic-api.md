---
title: 'Programmatic API'
description: Use @napi-rs/cli programmatic APIs to customize your build workflow.
---

# Programmatic API

The `@napi-rs/cli` package exports programmatic APIs that allow you to customize your build workflow beyond what the CLI commands offer. This is useful when you need to:

- Post-process build outputs (format, transform, or validate generated files)
- Integrate with custom build systems like Bazel
- Generate TypeScript definitions separately from the Rust compilation
- Build automation scripts with full control over the build process

## Post-Processing Build Outputs

The most common use case is running custom post-processing on the generated JavaScript and TypeScript files. Here's an example using <span class="chalk-green">oxfmt</span> to format the output files:

**build.ts**

```ts
import { readFile, writeFile } from 'node:fs/promises'

import { NapiCli, createBuildCommand } from '@napi-rs/cli'
import { format, type FormatOptions } from 'oxfmt'

import oxfmtConfig from './.oxfmtrc.json' with { type: 'json' }

const buildCommand = createBuildCommand(process.argv.slice(2))
const cli = new NapiCli()
const buildOptions = {
  ...buildCommand.getOptions(),
  cargoOptions: buildCommand.cargoOptions,
}
const { task } = await cli.build(buildOptions)
const outputs = await task

for (const output of outputs) {
  if (output.kind === 'js' || output.kind === 'dts') {
    const { code } = await format(
      output.path,
      await readFile(output.path, 'utf-8'),
      oxfmtConfig as FormatOptions,
    )
    await writeFile(output.path, code)
  }
}
```

Run this script with the same arguments you would pass to <span class="chalk-green">napi build</span>,
including Cargo arguments after `--`:

```sh
oxnode ./build.ts --release --platform
```

### How It Works

1. `createBuildCommand(args)` parses CLI arguments and returns a `BuildCommand` instance
2. `buildCommand.getOptions()` extracts the named options; `cargoOptions` carries
   the trailing arguments after `--`
3. `cli.build(options)` starts the build and returns `{ task, abort }`
4. `await task` waits for completion and returns an array of `Output` objects

### Output Types

Each item in the outputs array has this structure:

```ts
type OutputKind = 'js' | 'dts' | 'node' | 'exe' | 'wasm'

type Output = {
  kind: OutputKind
  path: string // Absolute path to the output file
}
```

| Kind                                  | Description                                                        |
| ------------------------------------- | ------------------------------------------------------------------ |
| <span class="chalk-green">node</span> | Native Node.js addon (<span class="chalk-green">.node</span> file) |
| <span class="chalk-green">js</span>   | JavaScript binding file                                            |
| <span class="chalk-green">dts</span>  | TypeScript definition file                                         |
| <span class="chalk-green">exe</span>  | Executable binary                                                  |
| <span class="chalk-green">wasm</span> | WebAssembly module                                                 |

## Standalone Types/JS Generation

::: info
This is useful for build systems like Bazel that handle Rust compilation separately and only need the TypeScript type generation step.

:::

If you compile Rust code outside of `@napi-rs/cli` (e.g., using Bazel's `rust_shared_library`), you can still generate TypeScript definitions using the `generateTypeDef` and `writeJsBinding` APIs:

**generate-types.ts**

```ts
import { spawn } from 'node:child_process'
import { mkdir, writeFile, copyFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { generateTypeDef, writeJsBinding, parseTriple } from '@napi-rs/cli'

import pkg from './package.json' with { type: 'json' }

const currentTarget = 'x86_64-unknown-linux-gnu'

const currentDir = dirname(fileURLToPath(import.meta.url))
const typeDefDir = join(currentDir, 'target', 'napi-rs', 'YOUR_PKG_NAME')
const triple = parseTriple(currentTarget)
const binaryName = pkg.napi.binaryName
const bindingName = `${binaryName}.${triple.platformArchABI}.node`

await mkdir(typeDefDir, { recursive: true })

const childProcess = spawn(
  'cargo',
  ['build', '--release', '--target', currentTarget],
  {
    stdio: 'pipe',
    env: {
      ...process.env,
      NAPI_TYPE_DEF_TMP_FOLDER: typeDefDir,
    },
  },
)

childProcess.stdout.on('data', (data) => {
  console.log(data.toString())
})

childProcess.stderr.on('data', (data) => {
  console.error(data.toString())
})

await new Promise((resolve, reject) => {
  childProcess.on('error', (error) => {
    reject(error)
  })
  childProcess.on('close', (code) => {
    if (code === 0) {
      resolve(true)
    } else {
      reject(new Error(`cargo build --release failed with code ${code}`))
    }
  })
})

// Remove an old loaded binding before replacing it. Overwriting it in place
// can cause crashes on platforms such as macOS.
await rm(join(currentDir, bindingName)).catch(() => {
  // ignore a missing old binding
})

await copyFile(
  join(currentDir, 'target', currentTarget, 'release', 'libfoo.so'),
  join(currentDir, bindingName),
)

const { dts, exports } = await generateTypeDef({
  typeDefDir,
  cwd: process.cwd(),
})

await writeFile(join(currentDir, 'customized.d.ts'), dts)

await writeJsBinding({
  jsBinding: 'customized.js',
  platform: true,
  binaryName,
  packageName: pkg.name,
  version: pkg.version,
  outputDir: currentDir,
  idents: exports,
})
```

::: warning
The `typeDefDir` must contain the intermediate type definition files generated by the `napi-derive` proc macro when the `type-def` feature is enabled. These files are normally created in a temporary directory during `napi build`.

:::

### Control Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SETUP PHASE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Read package.json for napi config                                   │
│  2. Get target triple (from cli flag) (e.g.,'x86_64-unknown-linux-gnu') │
│  3. parseTriple() → get platformArchABI for binding filename            │
│  4. mkdir(typeDefDir) → create directory for type definitions           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BUILD PHASE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  5. spawn('cargo', ['build', '--release', '--target', currentTarget])   │
│     └─ env: { NAPI_TYPE_DEF_TMP_FOLDER: typeDefDir }                    │
│        ▲                                                                │
│        └─ This env var tells napi-derive where to write type defs       │
│                                                                         │
│  6. Stream stdout/stderr from cargo                                     │
│  7. await cargo completion                                              │
│  8. rm(old binding) → Remove old .node file before replacement          │
│  9. copyFile(libfoo.so → <binaryName>.{platform}.node)                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      TYPE GENERATION PHASE                              │
├─────────────────────────────────────────────────────────────────────────┤
│ 10. generateTypeDef({ typeDefDir, cwd })                                │
│     └─ Reads newline-delimited JSON files from typeDefDir               │
│     └─ Returns { dts: string, exports: string[] }                       │
│                                                                         │
│ 11. writeFile('customized.d.ts', dts)                                   │
│                                                                         │
│ 12. writeJsBinding({ platform, binaryName, idents: exports, ... })      │
│     └─ Generates JS loader that imports the .node file                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                              ┌───────────┐
                              │   DONE    │
                              │           │
                              │ Output:   │
                              │ • .node   │
                              │ • .d.ts   │
                              │ • .js     │
                              └───────────┘
```

### Key Concepts

#### The `NAPI_TYPE_DEF_TMP_FOLDER` Environment Variable

When you run `cargo build` with `NAPI_TYPE_DEF_TMP_FOLDER` set, the `napi-derive` proc macro writes one extensionless file per Cargo package to that directory. Each file contains one JSON object per line. This is how type information flows from Rust to TypeScript:

```
Rust Code → napi-derive macro → newline-delimited JSON → generateTypeDef() → .d.ts
```

#### Platform-Specific Binding Names

The `parseTriple()` function extracts platform information from a target triple:

```ts
const triple = parseTriple('x86_64-unknown-linux-gnu')
// Returns: { platform: 'linux', arch: 'x64', abi: 'gnu', platformArchABI: 'linux-x64-gnu', ... }

const bindingName = `mylib.${triple.platformArchABI}.node`
// Result: 'mylib.linux-x64-gnu.node'
```

#### Removing Old Binding Files

On macOS/Linux, copying a new `.node` file over an existing one without first removing it can cause segmentation faults. Always remove the old file first:

```ts
await rm(join(currentDir, bindingName)).catch(() => {
  // ignore error if file doesn't exist
})
await copyFile(sourceLib, join(currentDir, bindingName))
```

### GenerateTypeDefOptions

| Option              | Type    | Required | Default | Description                                                                                                            |
| ------------------- | ------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| typeDefDir          | string  | Yes      |         | Directory containing intermediate type def files                                                                       |
| cwd                 | string  | Yes      |         | Working directory for resolving relative paths                                                                         |
| noDtsHeader         | boolean | No       | false   | Skip the default file header                                                                                           |
| dtsHeader           | string  | No       |         | Custom header string for the <span class="chalk-green">.d.ts</span> file; used when neither header-file option is set  |
| dtsHeaderFile       | string  | No       |         | Header file resolved from `cwd`; takes precedence over every other custom header option                                |
| configDtsHeader     | string  | No       |         | Header from config (lower priority than dtsHeader)                                                                     |
| configDtsHeaderFile | string  | No       |         | Header file from config; lower priority than `dtsHeaderFile`, but higher than inline header strings                    |
| constEnum           | boolean | No       | true    | Generate <span class="chalk-green">const enum</span> instead of regular enum                                           |
| runtimeStringEnum   | boolean | No       | false   | With `constEnum: false`, generate runtime enums for `#[napi(string_enum)]`; otherwise generate type-only string unions |

### WriteJsBindingOptions

| Option      | Type     | Required | Default    | Description                                                                |
| ----------- | -------- | -------- | ---------- | -------------------------------------------------------------------------- |
| platform    | boolean  | No       | false      | Required to generate JS binding; adds platform triple                      |
| noJsBinding | boolean  | No       | false      | Skip JS binding generation                                                 |
| idents      | string[] | Yes      |            | Exported identifiers from <span class="chalk-green">generateTypeDef</span> |
| jsBinding   | string   | No       | 'index.js' | Custom filename for the JS binding                                         |
| esm         | boolean  | No       | false      | Generate ESM format instead of CommonJS                                    |
| binaryName  | string   | Yes      |            | Name of the native binary                                                  |
| packageName | string   | Yes      |            | Package name for require/import statements                                 |
| version     | string   | Yes      |            | Package version                                                            |
| outputDir   | string   | Yes      |            | Directory to write the JS binding file                                     |

## Other Exported APIs

### NapiCli Class

The main class for programmatic access to all CLI commands:

```ts
import { NapiCli } from '@napi-rs/cli'

const cli = new NapiCli()

// Available methods:
cli.build(options) // Build the project
cli.artifacts(options) // Collect artifacts from CI
cli.new(options) // Create new project
cli.createNpmDirs(options) // Create npm package directories
cli.prePublish(options) // Prepare for publishing
cli.rename(options) // Rename project
cli.universalize(options) // Create universal binaries
cli.version(options) // Update versions
```

### Command Creators

Parse CLI arguments into command option objects:

```ts
import {
  createBuildCommand,
  createArtifactsCommand,
  createCreateNpmDirsCommand,
  createPrePublishCommand,
  createRenameCommand,
  createUniversalizeCommand,
  createVersionCommand,
  createNewCommand,
} from '@napi-rs/cli'

// Parse arguments as if running `napi build --release --platform`
const buildCmd = createBuildCommand(['--release', '--platform'])
const options = buildCmd.getOptions()
```

### Utility Functions

```ts
import { parseTriple, readNapiConfig } from '@napi-rs/cli'

// Parse target triple string
const triple = parseTriple('x86_64-unknown-linux-gnu')
// { platform: 'linux', arch: 'x64', abi: 'gnu', ... }

// The first argument is the exact package.json path. The optional second
// argument is a standalone napi config that takes precedence.
const config = await readNapiConfig(
  '/path/to/project/package.json',
  '/path/to/project/napi.config.json',
)
```

## Aborting a Build

The `build()` method returns an `abort` function to cancel the build:

```ts
const { task, abort } = await cli.build(options)

// Handle SIGINT to abort cleanly
process.on('SIGINT', () => {
  abort()
  process.exit(1)
})

const outputs = await task
```
