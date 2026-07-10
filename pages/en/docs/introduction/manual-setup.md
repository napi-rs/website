---
title: 'Manual setup'
description: Add NAPI-RS to an existing Rust crate, JavaScript package, or workspace without using a template.
---

# Manual setup

Use this guide when you already have a Rust crate or JavaScript package, need a
minimal project, or want to place the Rust and JavaScript packages in different
parts of a monorepo. If you are starting a standalone package and want the full
release workflow, [`napi new`](/docs/cli/new) is usually faster.

The CLI is a build and packaging tool. Your addon remains an ordinary Cargo
crate, so you can use the workspace layout and package manager you already have.

## Prerequisites

Install a current Rust toolchain, Node.js 22.13+ (or Node.js 24+) for the
current CLI, and the NAPI-RS CLI in the JavaScript package that owns the addon:

```sh
rustc --version
node --version
npm install --save-dev @napi-rs/cli@^3
```

Keeping the CLI local makes local builds and CI use the version recorded by the
project. Run it through a package script or `npx napi`; a global installation is
not required.

## Minimal project

The smallest useful layout is:

```text
my-addon/
├── Cargo.toml
├── build.rs
├── package.json
├── src/
│   └── lib.rs
└── test.cjs
```

### Configure Cargo

The library must be a `cdylib`: Node loads the resulting shared library rather
than linking it into another Rust executable. `napi-build` configures the output
for the host platform, and the default `napi-derive` features enable strict
macro validation and TypeScript definition generation.

**Cargo.toml**

```toml
[package]
name = "my-addon-native"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
napi = "3"
napi-derive = "3"

[build-dependencies]
napi-build = "2"
```

Create the build script:

**build.rs**

```rust
fn main() {
  napi_build::setup();
}
```

### Export a Rust function

**src/lib.rs**

```rust
use napi_derive::napi;

#[napi]
pub fn add(left: i32, right: i32) -> i32 {
  left + right
}
```

### Configure the JavaScript package

`binaryName` controls the generated file name. `--platform` adds the current
platform suffix and generates a loader that selects either the local binary or
the corresponding optional platform package.

**package.json**

```json
{
  "name": "my-addon",
  "version": "0.1.0",
  "main": "index.js",
  "types": "index.d.ts",
  "scripts": {
    "build": "napi build --platform",
    "build:release": "napi build --platform --release",
    "test": "node --test test.cjs"
  },
  "napi": {
    "binaryName": "my-addon"
  },
  "devDependencies": {
    "@napi-rs/cli": "^3"
  }
}
```

Build and call the addon:

**test.cjs**

```js
const assert = require('node:assert/strict')
const test = require('node:test')

const { add } = require('./index.js')

test('adds two numbers', () => {
  assert.equal(add(2, 3), 5)
})
```

```sh
npm run build
npm test
```

A debug build produces these files in the crate directory by default:

```text
index.d.ts
index.js
my-addon.<platform-arch-abi>.node
```

The `.node` file is the native library. Import `index.js`, not a hard-coded
platform file: the generated loader also handles libc selection, separately
published platform packages, and an optional WASI fallback.

::: info
Without `--platform`, the CLI copies a single `my-addon.node` file but does
not generate the JavaScript loader. That is useful for low-level experiments;
published packages should normally use `--platform`.

:::

## Common variations

### Async functions

Enable the `async` feature when an exported Rust `async fn` should become a
JavaScript `Promise`:

**Cargo.toml**

```toml
[dependencies]
napi = { version = "3", features = ["async"] }
napi-derive = "3"
tokio = { version = "1", features = ["fs"] }
```

See [Async and concurrency](/docs/more/async-concurrency) before choosing
between Tokio, `AsyncTask`, ThreadsafeFunction, and streams.

### A custom output directory

All paths are relative to `--cwd`. Place the generated JavaScript, TypeScript,
and native files in a JavaScript package with:

```sh
napi build --platform --output-dir ./dist
```

Keep the loader and its local `.node` file together. Moving only `index.js`
breaks its relative lookup.

### A separate config file

By default, the CLI reads the `napi` object from `package.json`. You can move
that object to JSON and pass `--config-path`; when both exist, the separate
file wins.

**napi.config.json**

```json
{
  "binaryName": "my-addon",
  "packageName": "@scope/my-addon",
  "targets": [
    "x86_64-unknown-linux-gnu",
    "aarch64-apple-darwin",
    "x86_64-pc-windows-msvc"
  ]
}
```

```sh
napi build --platform --config-path napi.config.json
```

`targets` describes the artifacts you intend to package. A local build still
builds one target at a time; pass `--target <rust-triple>` explicitly in CI.

## Cargo and JavaScript workspaces

The Rust crate and the JavaScript package do not have to share a directory.
For example:

```text
workspace/
├── Cargo.toml                 # [workspace] members = ["crates/native"]
├── crates/
│   └── native/
│       ├── Cargo.toml         # package.name = "my-addon-native"
│       ├── build.rs
│       └── src/lib.rs
└── packages/
    └── addon/
        └── package.json       # owns the napi config and generated output
```

Run the CLI from the workspace root while making every path explicit:

```sh
napi build \
  --cwd packages/addon \
  --manifest-path ../../Cargo.toml \
  --package my-addon-native \
  --package-json-path package.json \
  --output-dir . \
  --platform
```

The important distinction is:

| Option                | Selects                                                  |
| --------------------- | -------------------------------------------------------- |
| `--cwd`               | Base directory for all other relative paths              |
| `--manifest-path`     | Crate or workspace `Cargo.toml` used by `cargo metadata` |
| `--package`           | Exact Cargo package name to build inside a workspace     |
| `--package-json-path` | JavaScript package and NAPI-RS configuration             |
| `--output-dir`        | Destination for `.node`, loader, and `.d.ts` files       |

If the manifest points at a virtual Cargo workspace, `--package` is required.
The CLI otherwise cannot know which `cdylib` member owns the addon.

## Prepare for distribution

For one local machine, the generated loader and `.node` file are enough. A
published cross-platform package normally uses a separate optional npm package
for every target:

1. Add all release triples to `napi.targets`.
2. Build one `--platform --release --target <triple>` artifact per CI job.
3. Run [`napi create-npm-dirs`](/docs/cli/create-npm-dirs).
4. Download the CI artifacts and run [`napi artifacts`](/docs/cli/artifacts).
5. Follow the [release guide](/docs/deep-dive/release) and read every side
   effect of [`napi pre-publish`](/docs/cli/pre-publish) before publishing.

Do not publish a binary built on your development machine as if it supported
other operating systems. Use the [cross-build guide](/docs/cross-build) and test
the final package on each runtime you claim to support.

## What to read next

- [Testing and debugging](/docs/more/testing-debugging)
- [Integrating with applications and bundlers](/docs/more/integrations)
- [Troubleshooting](/docs/more/troubleshooting)
- [NAPI-RS configuration](/docs/cli/napi-config)
