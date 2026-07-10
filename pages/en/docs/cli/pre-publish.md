---
title: 'Pre Publish'
description: Safely version, publish, and attach napi-rs platform packages.
---

# Pre Publish

`napi pre-publish` (also available as `napi prepublish`) prepares and publishes
the per-platform packages for the root package's current version. It can also
create a GitHub release and upload the native binaries as release assets.

::: warning
This command has network and registry side effects by default. It is not a
packaging preview: it can publish multiple immutable npm versions before the
root package is published. Run it only from a controlled release job.

:::

The command does **not** collect or copy build artifacts. Run [`napi
artifacts`](./artifacts) first.

## Usage

```sh
napi pre-publish [--options]
```

```ts
import { NapiCli } from '@napi-rs/cli'

await new NapiCli().prePublish({
  tagStyle: 'npm',
  ghRelease: true,
})
```

Boolean options accept the `--no-` prefix. For example, use
`--no-gh-release` when the release does not run on GitHub.

## Options

| Option                | CLI syntax                  | Type           | Required | Default                                         | Description                                                                                                                                |
| --------------------- | --------------------------- | -------------- | :------: | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `cwd`                 | `--cwd`                     | `string`       |    No    | `process.cwd()`                                 | Working directory. All other relative paths resolve from here.                                                                             |
| `configPath`          | `--config-path,-c`          | `string`       |    No    |                                                 | Standalone napi config JSON file.                                                                                                          |
| `packageJsonPath`     | `--package-json-path`       | `string`       |    No    | <span class="chalk-green">`package.json`</span> | Root package metadata and release version.                                                                                                 |
| `npmDir`              | `--npm-dir,-p`              | `string`       |    No    | <span class="chalk-green">`npm`</span>          | Directory containing one prepared package per configured target.                                                                           |
| `tagStyle`            | `--tag-style,--tagstyle,-t` | `npm \| lerna` |    No    | <span class="chalk-green">`lerna`</span>        | How to resolve the GitHub release tag. `npm` uses `v<package version>`; `lerna` reads the package tag from the latest release commit.      |
| `ghRelease`           | `--gh-release`              | `boolean`      |    No    | `true`                                          | Create/find a GitHub release and upload target binaries when GitHub repository metadata is available.                                      |
| `ghReleaseName`       | `--gh-release-name`         | `string`       |    No    |                                                 | Name passed when creating the GitHub release.                                                                                              |
| `ghReleaseId`         | `--gh-release-id`           | `string`       |    No    |                                                 | Numeric ID of an existing release to receive assets. No new release is created.                                                            |
| `skipOptionalPublish` | `--skip-optional-publish`   | `boolean`      |    No    | `false`                                         | Do not run the package manager's publish command for per-platform packages. Metadata updates and enabled GitHub asset uploads still occur. |
| `dryRun`              | `--dry-run`                 | `boolean`      |    No    | `false`                                         | Skip package-file mutations, npm publication, GitHub release creation, and asset uploads.                                                  |

## Exact side effects

Without `--dry-run`, the command executes these phases in order:

1. Read the root package and napi config.
2. Set every configured platform package's `version` to the root version.
3. Merge one exact-version platform package entry per configured target into
   the root package's `optionalDependencies`. Existing entries are preserved,
   including obsolete target packages.
4. With GitHub releases enabled, resolve release metadata from the latest Git
   commit and `GITHUB_REPOSITORY`, then create a release unless
   `--gh-release-id` selects an existing one.
5. For each target whose expected `.node` or `.wasm` file exists in its npm
   directory, run `<npmClient> publish` unless `--skip-optional-publish` is set.
6. With GitHub releases enabled, upload that target file as a release asset.

An expected target file that is missing produces a warning and is skipped; it
does not fail the command. GitHub release creation and asset-upload failures
are logged and may not fail npm publication. Your CI must therefore verify the
complete artifact set and the final external state independently.

`napi pre-publish` never publishes the root package itself. In the generated
template it runs as `prepublishOnly`; after it returns successfully, the
surrounding `npm publish` operation publishes the root package.

## Required release state

Before running the command with real credentials, verify all of the following:

- The root `package.json` version is final and has never been published.
- `repository` points to the real GitHub repository. npm provenance validates
  repository and workflow identity.
- `napi.targets` contains exactly the packages intended for this release.
- Existing `optionalDependencies` have been reviewed. The command adds or
  updates configured targets but does not remove stale platform entries.
- [`napi create-npm-dirs`](./create-npm-dirs) has created every target package.
- [`napi artifacts`](./artifacts) has placed every expected binary in both the
  target package and the root workspace.
- Every target has passed a runtime test on the environment it claims to
  support.
- The configured npm client is authenticated for the root package and every
  target package.
- `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, and `contents: write` are available when
  GitHub releases are enabled.
- The workflow has `id-token: write` and npm provenance is enabled if the
  release is expected to carry provenance.

For the generated single-package workflow, use npm tag style:

**package.json**

```json
{
  "scripts": {
    "prepublishOnly": "napi prepublish -t npm"
  }
}
```

The default `lerna` style is only for a Lerna release commit whose body lists
the package tag that should be published.

## Preview safely

Run the command's own dry-run mode directly:

```sh
DEBUG=napi:* yarn napi prepublish -t npm --dry-run
```

This confirms that config and Git release metadata can be read, but it does
not verify that target binaries exist and it does not test registry
authorization.

To inspect the npm tarball without triggering the real `prepublishOnly`
script, disable lifecycle scripts explicitly:

```sh
npm pack --dry-run --ignore-scripts
```

::: danger
Do not use `npm publish --dry-run` as a safety substitute. npm can still run
lifecycle scripts, and a `prepublishOnly` script containing `napi
  prepublish` can publish the platform packages with real credentials.

:::

## Partial failure and recovery

The release is not transactional. npm does not let you overwrite a published
name and version, and this command cannot roll back packages that already
exist.

If a run fails:

1. Stop automatic retries until you know which packages and assets exist.
2. Check every target with `npm view <package>@<version> version`, check the
   root package separately, and inspect the GitHub release assets.
3. Keep the same build artifacts. Never publish changed bits under a version
   that already exists for another target.
4. Re-run the same version to publish missing targets. The CLI recognizes npm's
   standard "previously published versions" error and skips those packages;
   other registry errors still fail the run.
5. Pass `--gh-release-id <id>` to reuse an existing GitHub release, or
   `--no-gh-release` if release assets are intentionally managed elsewhere.
6. Use `--skip-optional-publish` only after confirming **all** platform
   packages already exist. It does not validate that condition for you.

If every platform package exists but the root publication failed, publish the
unchanged root tarball from the trusted release job with lifecycle scripts
disabled, for example `npm publish --ignore-scripts --access public`. Preserve
the same provenance configuration. If the root package was already published
while a platform package is missing, publish the missing package immediately
or deprecate the broken root version; npm provides no atomic rollback.

See [Release native packages](/docs/deep-dive/release) for the complete CI
runbook.
