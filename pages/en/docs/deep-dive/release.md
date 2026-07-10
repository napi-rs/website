---
title: 'Release native packages'
description: Build, verify, publish, and recover a multi-platform napi-rs release.
---

# Release native packages

napi-rs distributes prebuilt addons as npm packages. Consumers install one
small root package, and the package manager selects a matching optional package
for the current operating system, CPU, and libc. No compiler or install-time
download script is required on the consumer's machine.

::: warning
A multi-platform publication is not atomic. npm versions are immutable, and
a failure can occur after some platform packages exist but before the root
package is published. Treat release jobs as production changes, not as build
previews.

:::

## Distribution model

For a root package such as `@scope/addon`, napi-rs creates packages such as:

```text
@scope/addon
@scope/addon-darwin-arm64
@scope/addon-win32-x64-msvc
@scope/addon-linux-x64-gnu
@scope/addon-linux-x64-musl
```

Each platform package contains one native artifact and declares npm `os`,
`cpu`, and where applicable `libc` constraints. The root package lists exact
versions of those packages in `optionalDependencies`; its generated loader
then loads the package matching the running system.

This model avoids the two common alternatives:

- Shipping Rust/C/C++ source and requiring every consumer to install a native
  toolchain.
- Downloading a binary from GitHub or a CDN in `postinstall`, which introduces
  install-time network and private-network failures.

## Commands in the release pipeline

| Command                                          | Responsibility                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| [`napi create-npm-dirs`](../cli/create-npm-dirs) | Create one package directory for every configured target.                                                                 |
| [`napi build`](../cli/build)                     | Build one target per invocation. CI runs it once for every matrix row.                                                    |
| [`napi artifacts`](../cli/artifacts)             | Collect downloaded `.node`/`.wasm` files into the root and platform packages.                                             |
| [`napi pre-publish`](../cli/pre-publish)         | Synchronize versions and optional dependencies, publish platform packages, and optionally create/upload a GitHub release. |
| `npm publish`                                    | Publish the root package. In the template, this invokes `napi prepublish -t npm` through `prepublishOnly` first.          |

`napi pre-publish` does not build or collect artifacts, and it does not publish
the root package by itself.

## One-time release setup

Before the first release:

1. Use an npm scope or confirm that the root name and every suffixed target
   package name are available.
2. Set the final `name`, `repository`, `license`, and `publishConfig` in
   `package.json`. The repository must match the GitHub workflow for npm
   provenance.
3. Review `napi.binaryName` and `napi.targets`. Every target needs a package,
   build job, and runtime test; an accepted target triple alone is not a support
   guarantee.
4. Configure an npm automation token as the `NPM_TOKEN` Actions secret, unless
   you have deliberately replaced the template with npm trusted publishing.
   The identity must be allowed to publish the root and every platform name.
5. Keep `contents: write` for GitHub release creation and `id-token: write` for
   npm provenance in the publish job.
6. Run the normal branch/PR workflow successfully before enabling a release.

See [Support and compatibility](/docs/more/support-compatibility) and [Cross
build](../cross-build) before expanding the generated matrix.

## Preflight every version

Before creating a version commit, verify:

- The release commit is built from the intended clean branch and reviewed
  source.
- Local formatting, Rust checks, JavaScript tests, generated declarations, and
  a local native load all pass.
- The CI matrix builds every entry in `napi.targets`, and every produced file
  has the expected `binaryName.platform-arch-abi` suffix.
- The new root and platform versions do not already exist on npm.
- `npm whoami` succeeds with the release identity and the token is valid for
  all package names.
- The changelog and Node-API/runtime support statements match the release.

Inspect the root tarball without running lifecycle scripts:

```sh
npm pack --dry-run --ignore-scripts
```

Do not rely on `npm publish --dry-run`: npm lifecycle scripts may still invoke
`napi prepublish`, which can publish the real platform packages. Use [`napi
pre-publish --dry-run`](../cli/pre-publish#preview-safely) separately, knowing
that it does not validate artifact completeness or registry authorization.

## Release with the generated workflow

The maintained templates publish from their GitHub Actions workflow. The job:

1. Waits for lint, build, and runtime-test jobs.
2. Downloads all workflow artifacts with `actions/download-artifact@v8`.
3. Creates the target npm directories.
4. Runs `napi artifacts` to populate the root and platform packages.
5. Enables npm provenance.
6. Runs `npm publish` for the root package. Its `prepublishOnly` script runs
   `napi prepublish -t npm`, which publishes the platform packages and uploads
   GitHub release assets first.
7. Publishes a stable version with the default npm tag, or a prerelease with
   the `next` tag.

The current template decides whether to publish from the latest commit
message. `npm version` already writes the bare version as the commit message
(its `message` config defaults to `%s`); only the Git tag carries the `v`
prefix (`tag-version-prefix` defaults to `v`), and the template's publish gate
accepts both `1.2.3` and `v1.2.3`. So `npm version patch` alone already
produces a commit message the gate matches — passing `-m "%s"` below is
optional and only pins the message format:

```sh
# Creates the version commit and v-prefixed Git tag, but makes the commit
# message itself exactly the new version (for example, 1.2.3).
npm version patch -m "%s"
git push --follow-tags
```

For a prerelease:

```sh
npm version prerelease --preid next -m "%s"
git push --follow-tags
```

Review the generated `.github/workflows/CI.yml` before using these commands.
If your project has changed its trigger or release tooling, follow the checked
in workflow rather than this template convention.

## Release gates inside CI

Because the CLI warns and continues when an expected target file is missing,
add an explicit gate before the publish step. It should prove that:

- Every configured target directory exists.
- Every directory contains exactly the expected `.node` or `.wasm` file.
- WASI packages contain their generated loader and worker support files.
- No artifact has an unexpected binary name or target suffix.
- Platform runtime tests consumed the same artifacts that will be published.

Do not publish the root package unless all platform gates pass. Once the root
version exists, clients may immediately attempt to resolve every listed
optional dependency.

## Verify the published release

A green workflow is not enough. After publication:

1. Read the root metadata with `npm view @scope/addon@<version> --json` and
   confirm its dist-tag and exact `optionalDependencies`.
2. Query every platform package at the same version and inspect its `os`,
   `cpu`, `libc`, and tarball file list.
3. Confirm npm displays provenance when the workflow promised it.
4. Confirm the GitHub release points to the intended tag and contains every
   expected binary asset.
5. Install the root package into clean projects on representative glibc, musl,
   macOS, and Windows systems and call a native export.
6. Test native-to-WASI fallback separately when WASI is part of the release.

Keep the release workflow URL and verification results with the release notes.

## Recover from a partial release

Do not immediately bump the version or rebuild. First inventory npm packages,
the root package, and GitHub assets for the failed version. Published binaries
must never be replaced with different bits under the same version.

The recovery tools are:

- Re-run `napi prepublish -t npm` with the unchanged artifacts to publish
  missing platform packages. Already-published versions are skipped when npm
  returns its standard duplicate-version error.
- Pass `--gh-release-id <id>` to upload to an existing release instead of
  creating another one.
- Pass `--skip-optional-publish` only after independently confirming that every
  platform package already exists.
- If only the root package remains, publish the unchanged root tarball from the
  trusted release job with lifecycle scripts disabled so the platform phase is
  not repeated.

Follow the detailed [partial failure and recovery
procedure](../cli/pre-publish#partial-failure-and-recovery). If the root was
published with a missing platform dependency, publish the missing package
immediately or deprecate the broken root version; npm has no atomic rollback.
