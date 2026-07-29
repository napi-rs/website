# Deep research: polishing napi.rs website/docs for user-friendliness

Date: 2026-07-28
Method: 4 parallel audits — (A) docs content & IA, (B) napi-rs feature coverage vs docs, (C) site UX/frontend code, (D) external best practices (rspack, vite, biome, bun, deno, Cloudflare, Mintlify, PyO3, Neon, wasm-bindgen).
Repos: `website` (custom Vite SSG, docs in `content/docs/**`, locales en/cn/pt-BR) and `napi-rs` (framework source of truth: napi 3.12.0, @napi-rs/cli 3.8.0, MSRV 1.88).

---

## TL;DR

The plumbing is already strong (llms.txt + per-locale, raw `.md` per page, `rel=alternate`, ⌘K search, copy-code, edit-on-GitHub, i18n fallback middleware, Mermaid, OG images, sitemap lastmod). The gaps are:

1. **Visibility** — almost none of the AI/UX assets are reachable from the page UI.
2. **Search depth** — only title/headings/description indexed; body + code are not.
3. **Content rot in a few high-traffic spots** — v2→v3 migration guide, missing H1s, silently stale cn/pt-BR translations (30–61% of EN length on core pages), stale `function` type tables.
4. **Undocumented v3 features** — the custom async-runtime stack (feature + SPI + crate + examples), `type_tag`, `Either3/4`, `HandleScope`, `AsyncBlock`, `SendableResolver`, `@napi-rs/wasm-runtime`.

---

## P0 — Quick wins (small effort, high impact)

| #   | Fix                                                                                                                                                           | Evidence                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Copy-code button is invisible except `:hover` — undiscoverable on touch + keyboard. Add `:focus-visible` and `@media (hover:none)` rules in `pages/theme.css` | `@void/md/dist/theme/code.css:50-66`                        |
| 2   | Branded 404 page with search + links; `/docs` itself bare-404s today                                                                                          | no `pages/404*`; `components/docs/Navbar.tsx:12` comment    |
| 3   | Scroll active sidebar item into view on load (`scrollIntoView({block:'nearest'})`)                                                                            | `components/docs/Sidebar.tsx`                               |
| 4   | NotTranslatedBanner: add "Help translate this page →" CTA linking to repo new-file editor                                                                     | `components/docs/NotTranslatedBanner.tsx`                   |
| 5   | Skip link: add `tabIndex={-1}` to `<main id="main-content">` (focus doesn't move in Safari/Firefox)                                                           | `pages/layout.tsx:46`                                       |
| 6   | EditOnGithub: use `/edit/main/…` not `/blob/main/…`; render center edit link when TOC absent (xl+ edge case)                                                  | `components/docs/EditOnGithub.tsx:30,51`, `Toc.tsx:148-152` |
| 7   | Footer: add link column (Docs · GitHub · Discord · RSS · llms.txt); llms.txt currently linked nowhere                                                         | `components/docs/Footer.tsx`                                |
| 8   | Mobile drawer has `aria-modal` but no focus trap / initial focus — reuse Radix Dialog (already a dep)                                                         | `components/docs/Navbar.tsx:238-243`                        |

## P1 — AI-era affordances (connect what already exists)

| #   | Fix                                                                                                                                                                                              | Notes                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 9   | "Copy page" dropdown on docs pages: Copy as Markdown · View `.md` · Open in ChatGPT (`chatgpt.com/?q=`) · Open in Claude (`claude.ai/new?q=…<page>.md`). Raw `.md` twins already served per page | Pattern: Mintlify contextual menu, Cloudflare, Deno, bun.sh |
| 10  | Ship `/llms-full.txt` (concat all docs `.md` at build). Agents fetch the full bundle more than the index                                                                                         | Pattern: rspack.rs, Cloudflare, Anthropic                   |
| 11  | "Last updated" date per page — `scripts/generate-sitemap.mjs` already computes `gitLastmod`; reuse it                                                                                            | Pattern: Deno, Cloudflare, VitePress                        |
| 12  | Surface AI assets near page top or in TOC footer ("This page is also available as Markdown")                                                                                                     | rspack.rs does this verbatim                                |

## P1 — Search & core UX components

| #   | Fix                                                                                                                                                                                                                                         | Evidence                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 13  | Index body + code text (currently title/headings/description only; full-body indexing "intentionally DEFERRED"). Emit static per-locale JSON at build, lazy-fetch on dialog open — also fixes 3-locale index baked into every Navbar bundle | `lib/docs/search-index.ts:1-10`, `SearchDialog.tsx:34-36`                            |
| 14  | Search results: render matched heading as sub-row + group by section (same-titled pages are indistinguishable today)                                                                                                                        | `SearchDialog.tsx:165-190`                                                           |
| 15  | Synced package-manager tabs (npm/yarn/pnpm/bun, persisted choice). Getting-started serializes 3+ separate blocks today                                                                                                                      | `content/docs/introduction/getting-started.en.mdx:49-87`; pattern: rspack/vite/biome |
| 16  | Mobile "On this page" `<details>` atop article (TOC hidden below xl, no mobile TOC at all); fix scroll-spy sticking before last heading at page bottom                                                                                      | `components/docs/Toc.tsx:137-141`, `DocsLayout.tsx:128`                              |
| 17  | Localize remaining chrome strings ("On This Page", feedback line, Light/Dark/System)                                                                                                                                                        | `Toc.tsx:47-54`, `ThemeToggle.tsx:37-41`                                             |

## P2 — Content fixes (docs copy)

| #   | Fix                                                                                                                                                                                                                                                                                                                                | Evidence                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 18  | **v2→v3 migration guide is the weakest important page**: no H1, grammar errors ("This is aim for replace"), thin (134 lines), defers core topics to blog links. It's the entry point for the whole v2 user base                                                                                                                    | `content/docs/more/v2-v3-migration-guide.en.mdx`         |
| 19  | Missing H1 on 3 pages: `concepts/env` (547 lines!), `concepts/promise`, migration guide                                                                                                                                                                                                                                            | layout does not inject H1                                |
| 20  | **Silently stale translations**: banner only fires on missing files; all 50 pages exist in all locales, but cn+pt-BR `async-fn` ≈30%, `function` ≈37%, `promise` ≈61% of EN (missing `PromiseRaw`, unsafe-`&mut self`, 5 `function` sections). Either translate or add a staleness banner (line/word-count heuristic or git-based) | `lib/i18n/fallback.ts`, `middleware/02.i18n-fallback.ts` |
| 21  | `concepts/function` type tables are stale duplicates of `type-conversions` and contradict it (`Option<T>` mapping, v2 vocabulary). Delete tables, link to canonical page                                                                                                                                                           | `concepts/function.en.mdx` vs `type-conversions.en.mdx`  |
| 22  | dts-header documented in 3 places (types-overwrite, napi-config, napi-attributes) with overlapping precedence — consolidate to one source of truth                                                                                                                                                                                 | `concepts/types-overwrite.en.md`                         |
| 23  | CLI leaf pages (`version`, `universalize`, `create-npm-dirs`, `rename`) are 34–41-line option tables with zero example invocations and no pipeline context                                                                                                                                                                         | `content/docs/cli/*`                                     |
| 24  | `deep-dive/native-module` reads as current advice but recommends deprecated `windows-build-tools` + 2015 VC++ link + Node v10 permalinks — reframe as historical                                                                                                                                                                   | `deep-dive/native-module.en.mdx`                         |
| 25  | IA: Concepts order front-loads advanced material (`module-init` #2, `napi-attributes` #4) and buries `function` at #10; `deep-dive/release` (the publish capstone) sits after history reading. Consider: function/values/class early; move or cross-link release into the beginner path                                            | `content/docs/concepts/_meta.en.json`                    |
| 26  | `concepts/inject-env` example doesn't compile (calls methods never defined); `values` example has unused binding                                                                                                                                                                                                                   | `concepts/inject-env.en.mdx`, `concepts/values.en.mdx`   |
| 27  | Getting-started prerequisite wording confusing (recommends 22.13+/24+ but quotes engine range incl. 20.17)                                                                                                                                                                                                                         | `getting-started.en.mdx`                                 |

## P2 — Missing/weak feature docs (verified against napi-rs source)

| #   | Topic                                                                                                                                                                                                     | Evidence                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 28  | **`async-runtime` Cargo feature + `AsyncRuntime` SPI** (`register_async_runtime`, tokio-free builds, backend selection, panic=abort caveat) — the only Cargo.toml feature absent from cargo-features page | `napi-rs/crates/napi/src/lib.rs:37-60`, `tokio_runtime.rs:26-338` |
| 29  | **`napi-async-runtime` crate** (scheduler, spawn/spawn_blocking/sleep_until, MultiThread vs CurrentThread-WASM, `install`, host SPIs, metrics) — zero docs                                                | `napi-rs/crates/async-runtime/`                                   |
| 30  | `#[napi(type_tag = "...")]` — the one attrgen attribute missing from napi-attributes page                                                                                                                 | `macro/src/parser/attrs.rs:73`, `examples/napi/src/type_tag.rs`   |
| 31  | `AsyncBlock`/`AsyncBlockBuilder` (used by stream + fetch examples) — only a passing mention                                                                                                               | `tokio_runtime.rs:1325+`, `examples/napi/src/stream.rs`           |
| 32  | `Either3`/`Either4`, `HandleScope`/`EscapableHandleScope`, `SendableResolver` — public API, no docs                                                                                                       | `either.rs:158-159`, `js_values/scope.rs`, `sendable_resolver.rs` |
| 33  | `@napi-rs/wasm-runtime` package name never appears in docs (webassembly page says "memfs" generically)                                                                                                    | `napi-rs/wasm-runtime/package.json`                               |
| 34  | Dedicated web-streams page (`ReadableStream`/`WriteableStream` send/receive recipe) — scattered across 4 pages today                                                                                      | `examples/napi/src/stream.rs`                                     |
| 35  | custom-async-runtime + shared-async-runtime examples have no doc counterparts; `prepublish` CLI alias unmentioned                                                                                         | `napi-rs/examples/`                                               |
| 36  | `namespace` deep-dive walkthrough (nested js_mod exports) — attribute row only                                                                                                                            | `examples/napi/src/js_mod.rs`                                     |

## P3 — Bigger bets (evaluate separately)

- Version switcher (v2 ↔ v3) in navbar — M/med; rspack pattern.
- "Was this page helpful?" 👍/👎 → GitHub discussion (upgrade existing feedback link) — M/med; bun.sh.
- Examples/Recipes index page (examples-first trail; wasm-bindgen style) — M/med.
- Contributor avatars on docs pages — M/low-med; vite/biome.
- Docs MCP server (`search_napi_docs`/`fetch_page` over existing index + `.md`) — L/rising; Cloudflare.
- Interactive playground — L/low fit for native toolchain; defer.
- Line numbers for long code listings; copy-button aria-label + live-region; Mermaid sr-only text; light-mode link contrast 3.7:1 (underlined, borderline); gate landing animations behind `prefers-reduced-motion`.

## Already good — keep / don't regress

- Internal link health: 100% clean across all 3 locales incl. CJK anchors (verified).
- No version drift: MSRV 1.88, engine ranges, edition 2021 all match napi-rs source.
- CLI docs cover all 10 commands + flags (only `prepublish` alias missing).
- i18n fallback middleware + EN-mirror in search/nav = MDN/Starlight-recommended behavior.
- Theme bootstrap (no-FOUC, system, live OS listener); Mermaid lazy + theme-reactive; landmarks/aria on nav chrome.
- New guides section (troubleshooting, testing-debugging, integrations, async-concurrency, support-compatibility, cross-build) is precise and current.
