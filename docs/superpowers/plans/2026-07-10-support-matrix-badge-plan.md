# Support-matrix badge — implementation plan

Executes the approved spec: `docs/superpowers/specs/2026-07-10-support-matrix-badge-design.md`.
Read the spec for full rationale; this plan is the task breakdown.

Branch: `feat/support-matrix-badge`. Reference implementation to copy patterns from:
the sponsors image router (`routes/sponsors.{svg,png}.ts`, `lib/sponsors-image/*`).

## Global Constraints (bind every task)

- **Self-contained, query-encoded.** The image is a pure function of the query string —
  no network fetch, no package lookup. Never 500 on bad input: unknown/invalid triples and
  params are skipped (mirror `parseTheme` in `lib/sponsors-image/theme.ts`).
- **Reuse, don't refactor, the sponsors plumbing.** Import `ensureResvg`/`svgToPng` from
  `lib/sponsors-image/resvg.ts` and `loadFonts`/`readAsset` from `lib/sponsors-image/fonts.ts`
  as-is. Do not modify files under `lib/sponsors-image/`. The `declare module '*.wasm'` ambient
  in `lib/sponsors-image/wasm.d.ts` already covers the wasm imports.
- **`.wasm` imports live only in `routes/*.ts`** (they become `WebAssembly.Module` at the edge).
  Pass the module + fonts as arguments into `lib/support-matrix/*` units so those units stay
  Node-unit-testable (same split the sponsors code uses).
- **Top-level route paths** (`/support-matrix.svg`, `/support-matrix.png`) — never under
  `/docs`, `/blog`, `/changelog` (would hit i18n rewrites). Do **not** set any
  `Cross-Origin-Resource-Policy` / `Cross-Origin-Embedder-Policy` header (would break embeds).
- **Canonical target vocabulary = full Rust triples.** Aliases normalize to one entry:
  `wasm32-wasi-preview1-threads` ⇄ `wasm32-wasip1-threads`; `arm-linux-androideabi` ⇄
  `armv7-linux-androideabi`.
- **Resolution order (exact):** (1) expand `full` where it appears → seed that tier with the
  scaffold set; (2) explicit triples override the seed; (3) `omit` (triples or OS-group names)
  removes; (4) group survivors by OS. Precedence when a triple is in two explicit tiers:
  most-severe wins (untested > nonblocking > tested).
- **Three status tiers, fixed semantics:** `tested` = CI-tested (green), `nonblocking` =
  `continue-on-error` (amber), `untested` = built-not-exercised (gray). The rendered image
  reproduces the reference screenshot: three stacked cards (Node.js, Platforms grouped by OS,
  Browser), light + dark palettes.
- **Tests:** pure lib units are unit-tested with vitest; run a single test file with
  `yarn vp test run <path>` (there is no `test` script). A fresh worktree needs `void prepare`
  first (Tsconfig). Each task commits its own work.
- **Formatting:** the pre-commit hook runs `vp fmt`; let it. Do not hand-fight it.

## `full` scaffold set (authoritative for Task 1)

`full` expands to the napi-new scaffold targets (the landing "16 native targets"):

```
x86_64-apple-darwin, aarch64-apple-darwin,
x86_64-pc-windows-msvc, i686-pc-windows-msvc, aarch64-pc-windows-msvc,
x86_64-unknown-linux-gnu, aarch64-unknown-linux-gnu, armv7-unknown-linux-gnueabihf,
x86_64-unknown-linux-musl, aarch64-unknown-linux-musl,
aarch64-linux-android, armv7-linux-androideabi,
x86_64-unknown-freebsd,
wasm32-wasip1-threads
```

Additional targets that exist in `TARGETS` (addable to a tier explicitly, NOT seeded by `full`):
`powerpc64le-unknown-linux-gnu`, `s390x-unknown-linux-gnu`, `riscv64gc-unknown-linux-gnu`,
`aarch64-unknown-freebsd`, `armv7-unknown-linux-musleabihf`, `riscv64gc-unknown-linux-musl`,
`x86_64-unknown-linux-ohos`/`aarch64-unknown-linux-ohos`/`armv7-unknown-linux-ohos` (OpenHarmony).

Display-label rule: `{arch}[ {abi}]` — e.g. `x86_64-unknown-linux-gnu`→`x64 gnu`,
`aarch64-unknown-linux-musl`→`arm64 musl`, `i686-pc-windows-msvc`→`x32`,
`x86_64-pc-windows-msvc`→`x64`, `powerpc64le-*`→`ppc64le`, `s390x-*`→`s390x`,
`riscv64gc-*`→`riscv64`, `armv7-*-gnueabihf`→`armv7 gnu`, `wasm32-wasip1-threads`→`wasm32-wasi`.
OS-group names accepted by `omit`: `linux`, `windows`, `macos`, `android`, `freebsd`,
`openharmony`, `browser`.

---

## Task 1 — Data model + resolution + node logic (pure `lib/support-matrix/*`)

**Objective:** the pure, fully-unit-tested core: the target universe, the query→model
resolver, and the node-card deriver. No satori, no edge APIs.

**Files:**

- `lib/support-matrix/targets.ts` — `TARGETS: Record<Triple, {os, arch, abi?, label}>`,
  `FULL: Triple[]`, `OS_GROUPS: Record<string, Triple[]>`, `ALIASES`, and `normalizeTriple()`.
- `lib/support-matrix/resolve.ts` — `resolveMatrix(query): MatrixModel` where
  `MatrixModel = { name?, node: NodeModel|null, platforms: OsSection[], browser: BrowserModel|null }`
  and `OsSection = { os, chips: {label, tier}[] }`, `tier = 'tested'|'nonblocking'|'untested'`.
  Input `query` is a plain record of the parsed params (`tested`, `nonblocking`, `untested`,
  `omit`, `wasm`, `name`, `engines`, `nodeTested`). Applies the exact resolution order + precedence.
  Browser section present iff a `wasm32-wasi*` triple survived OR `wasm` truthy.
- `lib/support-matrix/node.ts` — `deriveNode(engines: string, nodeTested: number[], latest: number): NodeModel`
  where `NodeModel = { headline: 'v22.20 → v26', enginesRaw, excluded: string|null, pills: {major, floor, tested}[] }`.
  Export `NODE_LATEST = 26` constant. Parse the semver range with a minimal in-repo helper
  (major.minor `^`/`>=`/`||` forms are enough); compute floor (lowest satisfied version), ceiling
  (`latest`), excluded-gap prose, and per-major pills.

**Tests (TDD, write first):**

- `targets.test.ts`: `normalizeTriple` maps both alias spellings to canonical; `FULL` has the
  14 scaffold triples; label derivation for the examples above; every `FULL` + additional triple
  has a `TARGETS` entry; `OS_GROUPS.android` = the two android triples; etc.
- `resolve.test.ts`: `tested=full` → 14 chips all `tested`, grouped by OS; a triple in `untested`
  downgrades it out of the `full` seed; a non-scaffold triple in `nonblocking` is added; `omit=android`
  removes both android chips; `omit=<triple>` removes one; a triple listed in both `nonblocking` and
  `untested` resolves to `untested`; malformed triple is skipped (no throw); the **lzma fixture**
  (spec's worked example) yields exactly 11 tested / 2 nonblocking / 4 untested + browser present.
- `node.test.ts`: `deriveNode('^22.20 || ^24.12 || >=25', [22,24], 26)` → headline `v22.20 → v26`,
  excluded mentions `23` and `24.0`–`24.11`, pills `[{22,'22.20',true},{24,'24.12',true},{25,null,false},{26,null,false}]`
  (exact shape per implementer's reading; assert headline + excluded + which majors are `tested`).

**Acceptance:** all three test files green via `yarn vp test run lib/support-matrix/<f>.test.ts`.

---

## Task 2 — Renderer (`lib/support-matrix/{theme,card,render}.ts`)

**Objective:** turn a `MatrixModel` into an SVG string, and orchestrate SVG/PNG output, reusing
the sponsors satori/resvg/font plumbing.

**Files:**

- `lib/support-matrix/theme.ts` — `Palette` for light/dark: page bg, card bg/border, text,
  and the three tier colors (green/amber/gray, border + text), matching the reference screenshot.
  Export `palette(theme: 'light'|'dark'): Palette`.
- `lib/support-matrix/card.ts` — `renderSvg(model: MatrixModel, opts: {theme, fonts}): Promise<string>`.
  Builds React-less satori nodes (`{type, props}`), calls `satori(root, {width, fonts})`. Follow
  `lib/sponsors-image/card.ts` exactly for the `ensureYoga(wasm)` memo + node-tree style. Three
  stacked cards; OS-grouped chip rows; inline `<svg>` path for the check/warn icons (no icon font).
  Fixed width (~900); height derived by satori.
- `lib/support-matrix/render.ts` — `renderMatrix({format, theme, model, fonts, yogaWasm, resvgWasm?}):
Promise<{body, contentType}>`. SVG → `image/svg+xml; charset=utf-8`. PNG → call `ensureResvg` +
  `svgToPng` (reused from `lib/sponsors-image/resvg.ts`) at 2× width → `image/png`.

**Tests:**

- `card.test.ts`: render the lzma model + a `full` model + a minimal single-target model to SVG
  (light and dark); assert the SVG contains a `<svg`/`<text>` for each expected chip label and
  that the three tier colors appear; **string-snapshot** each. Load fonts from `public/fonts/*.ttf`
  via `fs.readFile` in the test (Node), pass a real yoga wasm module (import `satori/yoga.wasm`
  path via `fs.readFile` + `WebAssembly.compile`) — mirror `lib/sponsors-image/card.test.ts`.

**Acceptance:** snapshots stable across two runs; light and dark both produce a `<table>`-free
self-contained SVG (fonts as paths). Tests green.

---

## Task 3 — Routes (`routes/support-matrix.{svg,png}.ts`)

**Objective:** the two public endpoints — parse query → resolve → render → cache.

**Files:**

- `routes/support-matrix.svg.ts` and `routes/support-matrix.png.ts` — mirror
  `routes/sponsors.{svg,png}.ts`. Import `yogaWasm from 'satori/yoga.wasm'` (both) and
  `resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'` (png only). Parse params with `c.req.query(...)`;
  build the resolver input; `deriveNode` when `engines` present; `loadFonts((p)=>readAsset(c.env.ASSETS, c.req.url, p))`;
  `renderMatrix(...)`; return `new Response(body, { headers: { 'Content-Type', 'Cache-Control':
'public, s-maxage=86400, max-age=86400, stale-while-revalidate=604800' } })`. No CORP/COEP.
- Run `void prepare` so the routes register in `.void/routes.d.ts`; commit the regenerated file.

**Tests:**

- `routes/support-matrix.test.ts` (or a lib-level handler test): assert the svg handler returns
  `image/svg+xml` and a body containing `<svg`; the png handler returns `image/png`; a malformed
  query (`?tested=not-a-triple&engines=@@@`) still returns a valid image, not a 500. Use the same
  harness the sponsors route tests use if one exists; otherwise call the exported handler with a
  stub `c` (env.ASSETS reading `public/fonts` from disk).

**Acceptance:** tests green; `void prepare` clean; a local `curl` (documented in the report, not
required to run in CI) of both endpoints returns the image.

---

## Task 4 — URL-builder page (`/support-matrix`)

**Objective:** an interactive island page that builds the query and shows a live preview.

**Files:**

- `pages/support-matrix.island.tsx` → served at `/support-matrix` (en-only). Follow an existing
  island page (`pages/cn/index.island.tsx`, or a changelog island) for the island wiring.
- `components/support-matrix-builder/*` — the UI: a textarea to paste `napi.targets` (JSON array),
  a `full` toggle, per-target tier controls (default tested; mark nonblocking/untested), `engines`
  - tested-node-majors inputs, a light/dark toggle, a **live `<img src="/support-matrix.svg?…">`
    preview**, and copy buttons for the `<picture>` snippet and the PNG-markdown snippet. Build the
    query string with the SAME param names Task 3 parses (import shared helpers where reasonable, but
    do not import edge/wasm modules into the page bundle).

**Tests:**

- A pure unit test for the query-string builder (targets + tiers + engines + theme → the exact
  query Task 3 expects; round-trips the lzma example). Keep DOM/interaction testing light.

**Acceptance:** page builds; builder unit test green; preview `src` and snippets reflect the inputs.

---

## Task 5 — Docs (`content/docs/more/support-matrix-badge.{en,cn,pt-BR}.mdx`)

**Objective:** document the contract and embed snippets in all three locales, and regenerate mirrors.

**Files:**

- `content/docs/more/support-matrix-badge.en.mdx` (+ `.cn.mdx`, `.pt-BR.mdx`): what it is, the query
  param reference table, `full`/`omit` + precedence, copy-paste `<picture>` (SVG light/dark) and PNG
  markdown snippets, the worked lzma example, and a link to the `/support-matrix` builder. Locale-prefix
  internal links per [[cn-ptbr-links-must-be-locale-prefixed]] (cn/pt-BR use `/cn/…`, `/pt-BR/…`).
  Escape `|` inside table code cells as `\|` per [[md-table-code-pipes-must-escape]].
- Add nav entry in the relevant `_meta` files if the "more" section uses them.
- Regenerate `pages/` mirrors + nav (`scripts/convert-content.mjs` + the nav/route-map builders the
  cross-build migration used); revert any unrelated blog-date/image collateral per
  [[convert-content-strips-blog-date]].

**Tests:** `pages/content.test.ts` stays green; the new page renders (no `<table>` mismatch — run the
table scan from the prior fix if handy).

**Acceptance:** three locale pages + mirrors; `content.test.ts` green; build clean.

---

## Final

One batched `codex:adversarial-review` (foreground) over the whole branch, then a fix wave for
Critical/Important findings, then `finishing-a-development-branch` (push + PR) — per the repo's
batch-at-end review cadence.
