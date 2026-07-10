---
title: 'Support matrix badge'
description: Embed napi.rs's cross-platform support-matrix badge in any README with a self-contained, edge-cached SVG or PNG built entirely from URL query parameters.
---

# Support matrix badge

`napi.rs` serves your package's cross-platform support matrix as a single
self-contained image, built entirely from the URL query string. Point a README
`<img>` or `<picture>` at it and the badge renders the platform chips, their
tier colors, and the Node.js version line — no build step, no asset to generate,
no file to check in. The image is a pure function of its query, so the edge
caches it hard and it only changes when you change the URL.

## Two endpoints

| Endpoint                          | Use it for                                                         |
| --------------------------------- | ------------------------------------------------------------------ |
| `GET /support-matrix.svg?<query>` | GitHub READMEs. Pair two in a `<picture>` to switch on light/dark. |
| `GET /support-matrix.png?<query>` | npm and crates.io, whose READMEs strip `<picture>` and inline SVG. |

Both accept the same query and default to the light theme.

## Build your URL

You rarely need to hand-write the query. The interactive builder at
[/support-matrix](/support-matrix) lets you pick triples per tier, enter your
`engines` range, and copies the finished `<picture>` and PNG snippets for you.
The rest of this page documents the contract the builder emits.

## Query parameters

| Parameter     | What it controls                                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tested`      | Comma-separated Rust target triples that CI runs and gates on — green chips. The literal `full` expands to the `napi new` scaffold set.                          |
| `nonblocking` | Triples whose CI job is non-blocking (`continue-on-error`) — amber chips.                                                                                        |
| `untested`    | Triples that are built but not exercised in CI — gray chips.                                                                                                     |
| `omit`        | Triples or OS-group names to drop after the tiers resolve. Groups: `macos`, `windows`, `linux`, `android`, `freebsd`, `openharmony`, `browser`.                  |
| `engines`     | The package's `engines.node` range, e.g. `^22.20 \|\| ^24.12 \|\| >=25`. Derives the `vMIN → vMAX` headline plus the list of excluded majors and partial ranges. |
| `nodeTested`  | Node majors that CI runs, comma-separated, e.g. `22,24`. Marks those version pills as tested.                                                                    |
| `wasm`        | `1` forces the Browser (WASI) card. It also turns on automatically when a `wasm32-wasi*` triple is present.                                                      |
| `name`        | Cosmetic package name shown in the title and the image alt text.                                                                                                 |
| `theme`       | `light` (default) or `dark`.                                                                                                                                     |

Values are canonical Rust target triples (`x86_64-unknown-linux-gnu`,
`aarch64-apple-darwin`, …). The two common alternate spellings
`wasm32-wasi-preview1-threads` and `arm-linux-androideabi` are accepted and
normalized to their canonical form.

## How the query resolves

The service applies a fixed order and never throws: unknown triples, unknown
group names, and malformed params are skipped, so a slightly wrong URL still
renders something sensible.

1. **`full` seeds a tier** with the scaffold set — exactly the targets
   `napi new` generates.
2. **Explicit triples override the seed.** Naming a triple in any tier wins over
   whatever `full` seeded it as.
3. **Most severe tier wins** when the same triple appears in two tiers:
   `untested` > `nonblocking` > `tested`.
4. **`omit` subtracts last**, by triple or by OS group.
5. **Platforms you never build are simply left out** — there is no "unsupported"
   tier, so leave those triples out of every list.

## Embed it

For a GitHub README, serve a light and a dark SVG from one `<picture>` so the
badge follows the reader's theme:

```html
<picture>
  <source
    media="(prefers-color-scheme: dark)"
    srcset="https://napi.rs/support-matrix.svg?theme=dark&tested=full&engines=^22.20 || ^24.12 || >=25"
  />
  <img
    alt="napi-rs support matrix"
    src="https://napi.rs/support-matrix.svg?theme=light&tested=full&engines=^22.20 || ^24.12 || >=25"
  />
</picture>
```

npm and crates.io strip `<picture>`, so use a single PNG there:

```md
![support matrix](https://napi.rs/support-matrix.png?tested=full&engines=^22.20 || ^24.12 || >=25)
```

## Worked example

The `@napi-rs/lzma` badge marks two Linux triples non-blocking, four more
untested, tracks Node 22 and 24 in CI, and supports Node `^22.20 || ^24.12 || >=25`:

```
https://napi.rs/support-matrix.svg?tested=full
  &nonblocking=powerpc64le-unknown-linux-gnu,s390x-unknown-linux-gnu
  &untested=riscv64gc-unknown-linux-gnu,aarch64-linux-android,arm-linux-androideabi,wasm32-wasi-preview1-threads
  &engines=^22.20 || ^24.12 || >=25&nodeTested=22,24&name=@napi-rs/lzma
```

That renders a `v22.20 → v26` Node headline with `23` and `24.0–24.11` marked
excluded, the ppc64le and s390x chips in amber, and the riscv64, both Android,
and the Browser chips in gray. The line breaks above are only for reading — send
it as one line (the builder percent-encodes the spaces in `engines` for you).
