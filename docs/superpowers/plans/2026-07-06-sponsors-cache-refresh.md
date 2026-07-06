# Sponsors Cache + Refresh (webhook + cron) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the napi-rs sponsor list + rendered images always-fresh and cheap to serve by caching them (list JSON in KV, image blobs in R2 keyed via KV) and refreshing on a GitHub Sponsors webhook + a daily cron.

**Architecture:** A shared `refreshSponsorsCache()` fetches the live sponsor list, renders the 4 image blobs (svg/png × light/dark) once, writes the blobs to R2 under a content-version folder, and flips a KV manifest pointing at them (+ the raw list JSON in KV). A daily cron runs it with `force` (catches avatar/name changes); a signature-verified webhook runs it on sponsorship events (hash-skips no-op changes). The image routes serve bytes straight from R2 via the KV manifest (cold miss → live render + background warm); the landing loaders read the cached list (live fallback).

**Tech Stack:** Void 0.10.x (Cloudflare Worker), KV binding `c.env.KV`, R2 binding `c.env.STORAGE`, `crons/` + `defineScheduled`, Hono `POST` route, Web Crypto HMAC-SHA256, reuses the existing `lib/sponsors-image/*` render pipeline + `loadSponsors()`.

## Global Constraints

Bind every task. Exact values, copied verbatim.

- **This extends branch `feat/sponsors-image-router` (PR #483).** All work is committed on that branch.
- **Bindings:** enable in `void.json` `inference.bindings`: `kv: true`, `storage: true` (leave `db`, `ai` false). Runtime bindings are `c.env.KV` (KVNamespace) and `c.env.STORAGE` (R2Bucket) — verified present + working in `vp preview`.
- **KV usage:** JSON via `kv.put(key, JSON.stringify(x))` + `JSON.parse(await kv.get(key, {type:'text'}))`. Keys: `sponsors:data` (the `WashedSponsors` list JSON), `sponsors:manifest` (JSON `{version, updatedAt, images}`).
- **R2 usage:** image bytes via `STORAGE.put(key, bytes, { httpMetadata: { contentType } })`, read via `(await STORAGE.get(key))?.arrayBuffer()`, delete via `STORAGE.delete(key|key[])`. R2 object keys: `sponsors/<version>/<format>-<theme>` (e.g. `sponsors/ab12cd34ef567890/png-dark`). `version` = first 16 hex chars of SHA-256 of the sponsors JSON.
- **Do NOT depend on `@cloudflare/workers-types`.** Define minimal structural `KVStore` / `R2Store` interfaces in `store.ts` and cast `c.env.KV`/`c.env.STORAGE` to them (mirrors the existing `AssetsFetcher` pattern in `lib/sponsors-image/fonts.ts`).
- **Cron:** `crons/refresh-sponsors.ts` — `export const cron = '0 5 * * *'` (daily 05:00 UTC) + `export default defineScheduled(async (controller, env) => …)` from `'void'`. Void auto-configures the CF trigger on deploy. The cron calls refresh with `force: true`.
- **Webhook:** `routes/webhooks/github-sponsors.ts` → `POST /webhooks/github-sponsors`. Read raw body via `await c.req.text()`; verify header `x-hub-signature-256` = `sha256=<HMAC-SHA256(rawBody, secret) hex>` (constant-time via `crypto.subtle.verify`). Require header `x-github-event: sponsorship`. On success `c.executionCtx.waitUntil(refresh(force:false))` then return `202`. Bad/missing signature → `401`; secret unset → `503`; other events → `204`.
- **Secret:** add `GITHUB_SPONSORS_WEBHOOK_SECRET: string().secret().optional()` to `env.ts`; read via `import { env } from 'void/env'`. Provisioned via `void secret put` (prod) / `.env.local` (dev).
- **Refresh reuses (do not reimplement):** `loadSponsors()` (add a `{bypassCache?}` param), and from `lib/sponsors-image/`: `capBackers`, `inlineSponsorAvatars` (accepts an optional `fetchImage`), `renderSvg`, `CARD_WIDTH`, `ensureYoga`, `ensureResvg`, `svgToPng`, `loadFonts`, `readAsset`, `parseTheme`. PNG rasterized at `CARD_WIDTH * 2`. SVG content-type `image/svg+xml; charset=utf-8`; PNG `image/png`.
- **wasm imports** (`import x from 'satori/yoga.wasm'` / `'@resvg/resvg-wasm/index_bg.wasm'`) live ONLY in the worker-entry files that need them: `crons/refresh-sponsors.ts`, `routes/webhooks/github-sponsors.ts`, `routes/sponsors.{svg,png}.ts`. `lib/` units receive `WebAssembly.Module` as params (stay Node-testable).
- **Serve `Cache-Control` (both image routes, updated):** `public, s-maxage=600, max-age=600, stale-while-revalidate=86400` (shorter s-maxage than before — origin is now a cheap KV/R2 read, so webhook updates propagate faster).
- **Consumers read cache:** `pages/{en,cn,pt-BR}/index.server.ts` load via `getCachedSponsors(c.env.KV)` (KV-first, live fallback). Image routes serve from R2 via manifest; cold miss → render from `getCachedSponsors(c.env.KV)` (KV-first, live fallback) for this request + `waitUntil(refresh(force:true))` to warm. (Superseded the earlier "live render on cold miss": a bare live fetch degrades to empty on a GitHub outage and that empty image then CDN-caches for `s-maxage`, even when a good KV snapshot was available — Codex PR #483 review.)
- **Preserve `sliver` misspelling** (real data key) everywhere.
- **Test runner:** `corepack yarn vp test run <path>` (vitest). Add `// @vitest-environment node` to tests using `node:fs`/`WebAssembly`/`crypto`. NOTE: `void/env` reads `globalThis.__env__` (not `process.env`) and THROWS `"Cloudflare env is unavailable"` outside a request — so a test that exercises code reading `env.GITHUB_TOKEN` (e.g. `load-sponsors.test.ts`) must seed `(globalThis as any).__env__ = { GITHUB_TOKEN: 'dummy' }` in `beforeEach` (the token is still required — not weakened); a `GITHUB_TOKEN=dummy` command prefix does NOT work.
- **Never commit** `dist/`, `.env.local`, `.void/`, `node_modules` (gitignored). The build inlines the token into `dist/ssr/wrangler.json` → `rm -rf dist` after any local build.

## File Structure

```
void.json                              enable kv+storage bindings                    [Task 1]
env.ts                                 + GITHUB_SPONSORS_WEBHOOK_SECRET               [Task 1]
lib/sponsors-cache/
  signature.ts    verifyGithubSignature() — Web Crypto HMAC-SHA256                    [Task 2]
  store.ts        KVStore/R2Store types, keys, read*/writeSnapshot                    [Task 3]
  refresh.ts      refreshSponsorsCache(), hashSponsors()                              [Task 6]
  *.test.ts
lib/landing/
  load-sponsors.ts   + {bypassCache?} param                                          [Task 4]
  get-sponsors.ts    getCachedSponsors() — KV-first + live fallback                   [Task 5]
crons/
  refresh-sponsors.ts   daily 05:00 UTC, force refresh                                [Task 7]
routes/webhooks/
  github-sponsors.ts    POST — verify sig + waitUntil(refresh)                        [Task 7]
routes/
  sponsors.svg.ts, sponsors.png.ts   (modify) serve from cache + cold warm            [Task 8]
pages/{en,cn,pt-BR}/index.server.ts  (modify) getCachedSponsors                       [Task 8]
```

---

### Task 1: Enable KV + R2 bindings and the webhook secret

**Files:**

- Modify: `void.json` (`inference.bindings`)
- Modify: `env.ts` (add secret)

**Interfaces:**

- Produces: the `c.env.KV` / `c.env.STORAGE` bindings (provisioned) and `env.GITHUB_SPONSORS_WEBHOOK_SECRET` (typed, optional).

- [ ] **Step 1: Enable the bindings in `void.json`**

Find the `inference.bindings` block and set `kv` and `storage` to `true`:

```json
  "inference": {
    "bindings": {
      "db": false,
      "kv": true,
      "storage": true,
      "ai": false
    }
  },
```

- [ ] **Step 2: Add the webhook secret to `env.ts`**

`env.ts` currently declares `GITHUB_TOKEN: string().secret().optional()`. Add the webhook secret in the same `defineEnv({...})` object:

```ts
GITHUB_SPONSORS_WEBHOOK_SECRET: string().secret().optional(),
```

(Keep `.optional()` so a deploy without it doesn't hard-fail; the webhook route returns 503 when it's unset.)

- [ ] **Step 3: Verify the bindings are generated**

Run:

```bash
corepack yarn void prepare && corepack yarn build 2>&1 | tail -3
node -e "const w=require('./dist/ssr/wrangler.json'); console.log('kv:', JSON.stringify(w.kv_namespaces)); console.log('r2:', JSON.stringify(w.r2_buckets))"
rm -rf dist
```

Expected: build succeeds; prints `kv: [{"binding":"KV","id":"local"}]` and `r2: [{"binding":"STORAGE","bucket_name":"default"}]`.

- [ ] **Step 4: Commit**

```bash
git add void.json env.ts
git commit -m "feat(sponsors-cache): enable KV + R2 bindings + webhook secret"
```

---

### Task 2: GitHub webhook signature verification

**Files:**

- Create: `lib/sponsors-cache/signature.ts`
- Test: `lib/sponsors-cache/signature.test.ts`

**Interfaces:**

- Produces: `function verifyGithubSignature(secret: string, rawBody: string, signatureHeader: string | null | undefined): Promise<boolean>`.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
// lib/sponsors-cache/signature.test.ts
import { describe, it, expect } from 'vitest'
import { verifyGithubSignature } from './signature.ts'

// Build a valid GitHub-style signature header with Web Crypto (same as GitHub does).
async function sign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body),
  )
  const hex = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `sha256=${hex}`
}

describe('verifyGithubSignature', () => {
  const secret = 'topsecret'
  const body = '{"action":"created"}'

  it('accepts a correct signature', async () => {
    expect(
      await verifyGithubSignature(secret, body, await sign(secret, body)),
    ).toBe(true)
  })
  it('rejects a tampered body', async () => {
    expect(
      await verifyGithubSignature(secret, body + 'x', await sign(secret, body)),
    ).toBe(false)
  })
  it('rejects a wrong secret', async () => {
    expect(
      await verifyGithubSignature('other', body, await sign(secret, body)),
    ).toBe(false)
  })
  it('rejects missing / malformed headers', async () => {
    expect(await verifyGithubSignature(secret, body, undefined)).toBe(false)
    expect(await verifyGithubSignature(secret, body, 'sha1=abcd')).toBe(false)
    expect(await verifyGithubSignature(secret, body, 'sha256=zz')).toBe(false)
    expect(await verifyGithubSignature(secret, body, 'sha256=')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn vp test run lib/sponsors-cache/signature.test.ts`
Expected: FAIL — cannot resolve `./signature.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/sponsors-cache/signature.ts
// Verify a GitHub webhook X-Hub-Signature-256 header: HMAC-SHA256 of the RAW
// request body, hex, prefixed "sha256=". crypto.subtle.verify is constant-time.

export async function verifyGithubSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null | undefined,
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  const sigBytes = hexToBytes(signatureHeader.slice('sha256='.length))
  if (!sigBytes) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  return crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(rawBody),
  )
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex))
    return null
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack yarn vp test run lib/sponsors-cache/signature.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/sponsors-cache/signature.ts lib/sponsors-cache/signature.test.ts
git commit -m "feat(sponsors-cache): GitHub webhook signature verification"
```

---

### Task 3: KV + R2 cache store

**Files:**

- Create: `lib/sponsors-cache/store.ts`
- Test: `lib/sponsors-cache/store.test.ts`

**Interfaces:**

- Consumes: `WashedSponsors` from `../landing/sponsors.ts`.
- Produces: types `ImageFormat = 'svg'|'png'`, `ImageTheme = 'light'|'dark'`, `KVStore`, `R2Store`, `SponsorsManifest`, `RenderedImage`; consts `DATA_KEY`, `MANIFEST_KEY`; `imageSlot(format, theme): string`; `readManifest(kv): Promise<SponsorsManifest|null>`; `readData(kv): Promise<WashedSponsors|null>`; `readImage(kv, r2, format, theme): Promise<{body: Uint8Array; contentType: string}|null>`; `writeSnapshot(kv, r2, data, version, images: RenderedImage[]): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
// lib/sponsors-cache/store.test.ts
import { describe, it, expect } from 'vitest'
import {
  readManifest,
  readData,
  readImage,
  writeSnapshot,
  imageSlot,
  DATA_KEY,
  MANIFEST_KEY,
  type KVStore,
  type R2Store,
  type RenderedImage,
} from './store.ts'
import type { WashedSponsors } from '../landing/sponsors.ts'

function fakeKV(): KVStore & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    async get(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    async put(key: string, value: string) {
      store.set(key, value)
    },
  }
}
function fakeR2(): R2Store & { store: Map<string, Uint8Array> } {
  const store = new Map<string, Uint8Array>()
  return {
    store,
    async get(key: string) {
      if (!store.has(key)) return null
      const bytes = store.get(key)!
      return {
        async arrayBuffer() {
          return bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ) as ArrayBuffer
        },
      }
    },
    async put(key: string, value: ArrayBuffer | ArrayBufferView) {
      store.set(
        key,
        value instanceof ArrayBuffer
          ? new Uint8Array(value)
          : new Uint8Array((value as ArrayBufferView).buffer),
      )
    },
    async delete(key: string | string[]) {
      for (const k of Array.isArray(key) ? key : [key]) store.delete(k)
    },
  }
}
function sample(): WashedSponsors {
  return {
    specialThanks: [{ name: 'A', img: 'x', url: 'y' }],
    platinum: [],
    gold: [],
    sliver: [],
    backers: [],
  }
}
function images(tag: string): RenderedImage[] {
  return [
    {
      format: 'svg',
      theme: 'light',
      body: new TextEncoder().encode(`<svg>${tag}L</svg>`),
      contentType: 'image/svg+xml; charset=utf-8',
    },
    {
      format: 'svg',
      theme: 'dark',
      body: new TextEncoder().encode(`<svg>${tag}D</svg>`),
      contentType: 'image/svg+xml; charset=utf-8',
    },
    {
      format: 'png',
      theme: 'light',
      body: new Uint8Array([1, 2, 3]),
      contentType: 'image/png',
    },
    {
      format: 'png',
      theme: 'dark',
      body: new Uint8Array([4, 5, 6]),
      contentType: 'image/png',
    },
  ]
}

describe('store', () => {
  it('writeSnapshot persists data + manifest + 4 R2 objects; readers see them', async () => {
    const kv = fakeKV(),
      r2 = fakeR2()
    await writeSnapshot(kv, r2, sample(), 'v1', images('a'))
    expect(kv.store.has(DATA_KEY)).toBe(true)
    expect(kv.store.has(MANIFEST_KEY)).toBe(true)
    expect(r2.store.size).toBe(4)

    const data = await readData(kv)
    expect(data?.specialThanks[0].name).toBe('A')

    const manifest = await readManifest(kv)
    expect(manifest?.version).toBe('v1')
    expect(manifest?.images[imageSlot('png', 'dark')].key).toBe(
      'sponsors/v1/png-dark',
    )

    const img = await readImage(kv, r2, 'png', 'dark')
    expect([...img!.body]).toEqual([4, 5, 6])
    expect(img!.contentType).toBe('image/png')
  })

  it('a new snapshot version deletes the previous version R2 objects', async () => {
    const kv = fakeKV(),
      r2 = fakeR2()
    await writeSnapshot(kv, r2, sample(), 'v1', images('a'))
    await writeSnapshot(kv, r2, sample(), 'v2', images('b'))
    expect(r2.store.size).toBe(4) // only v2 objects remain
    expect(
      [...r2.store.keys()].every((k) => k.startsWith('sponsors/v2/')),
    ).toBe(true)
    expect((await readManifest(kv))?.version).toBe('v2')
  })

  it('readImage returns null when nothing is cached', async () => {
    expect(await readImage(fakeKV(), fakeR2(), 'svg', 'light')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn vp test run lib/sponsors-cache/store.test.ts`
Expected: FAIL — cannot resolve `./store.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/sponsors-cache/store.ts
// KV + R2 cache for the sponsor list and rendered images. The list JSON and a
// manifest (mapping format:theme -> R2 object key) live in KV; the image bytes
// live in R2 under a per-version folder. writeSnapshot flips the manifest last
// (atomic pointer swap) and best-effort deletes the previous version's objects.

import type { WashedSponsors } from '../landing/sponsors.ts'

export type ImageFormat = 'svg' | 'png'
export type ImageTheme = 'light' | 'dark'

// Minimal structural bindings (avoids depending on @cloudflare/workers-types).
export interface KVStore {
  get(key: string, opts?: { type?: 'text' }): Promise<string | null>
  put(
    key: string,
    value: string,
    opts?: { expirationTtl?: number },
  ): Promise<void>
}
export interface R2Store {
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView,
    opts?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>
  delete(key: string | string[]): Promise<void>
}

export interface ImageEntry {
  key: string
  contentType: string
}
export interface SponsorsManifest {
  version: string
  updatedAt: string
  images: Record<string, ImageEntry>
}
export interface RenderedImage {
  format: ImageFormat
  theme: ImageTheme
  body: Uint8Array
  contentType: string
}

export const DATA_KEY = 'sponsors:data'
export const MANIFEST_KEY = 'sponsors:manifest'

export function imageSlot(format: ImageFormat, theme: ImageTheme): string {
  return `${format}:${theme}`
}

export async function readManifest(
  kv: KVStore,
): Promise<SponsorsManifest | null> {
  const raw = await kv.get(MANIFEST_KEY, { type: 'text' })
  return raw ? (JSON.parse(raw) as SponsorsManifest) : null
}

export async function readData(kv: KVStore): Promise<WashedSponsors | null> {
  const raw = await kv.get(DATA_KEY, { type: 'text' })
  return raw ? (JSON.parse(raw) as WashedSponsors) : null
}

export async function readImage(
  kv: KVStore,
  r2: R2Store,
  format: ImageFormat,
  theme: ImageTheme,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const manifest = await readManifest(kv)
  const entry = manifest?.images[imageSlot(format, theme)]
  if (!entry) return null
  const obj = await r2.get(entry.key)
  if (!obj) return null
  return {
    body: new Uint8Array(await obj.arrayBuffer()),
    contentType: entry.contentType,
  }
}

export async function writeSnapshot(
  kv: KVStore,
  r2: R2Store,
  data: WashedSponsors,
  version: string,
  images: RenderedImage[],
): Promise<void> {
  const previous = await readManifest(kv)
  const manifest: SponsorsManifest = {
    version,
    updatedAt: new Date().toISOString(),
    images: {},
  }
  for (const img of images) {
    const key = `sponsors/${version}/${img.format}-${img.theme}`
    await r2.put(key, img.body, {
      httpMetadata: { contentType: img.contentType },
    })
    manifest.images[imageSlot(img.format, img.theme)] = {
      key,
      contentType: img.contentType,
    }
  }
  await kv.put(DATA_KEY, JSON.stringify(data))
  await kv.put(MANIFEST_KEY, JSON.stringify(manifest))
  if (previous && previous.version !== version) {
    const oldKeys = Object.values(previous.images).map((e) => e.key)
    if (oldKeys.length) await r2.delete(oldKeys).catch(() => {})
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack yarn vp test run lib/sponsors-cache/store.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/sponsors-cache/store.ts lib/sponsors-cache/store.test.ts
git commit -m "feat(sponsors-cache): KV manifest + R2 blob store"
```

---

### Task 4: `loadSponsors` cache-bypass option

**Files:**

- Modify: `lib/landing/load-sponsors.ts:152-155`
- Test: `lib/landing/load-sponsors.test.ts`

**Interfaces:**

- Produces: `loadSponsors(options?: { bypassCache?: boolean }): Promise<WashedSponsors>` — `bypassCache: true` skips the 10-min in-isolate cache and always refetches. Existing no-arg callers are unaffected.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
// lib/landing/load-sponsors.test.ts
// Run with a token so the loader actually fetches: GITHUB_TOKEN=dummy vp test run <this file>
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadSponsors } from './load-sponsors.ts'

const EMPTY_PAYLOAD = {
  data: {
    org: {
      sponsorshipsAsMaintainer: { pageInfo: { hasNextPage: false }, nodes: [] },
    },
    special: null,
  },
}

describe('loadSponsors bypassCache', () => {
  let calls: number
  beforeEach(() => {
    calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1
        return new Response(JSON.stringify(EMPTY_PAYLOAD), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it('caches by default and bypasses when asked', async () => {
    await loadSponsors() // fetch #1, populates the in-isolate cache
    expect(calls).toBe(1)
    await loadSponsors() // served from cache, no fetch
    expect(calls).toBe(1)
    await loadSponsors({ bypassCache: true }) // forces fetch #2
    expect(calls).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `GITHUB_TOKEN=dummy corepack yarn vp test run lib/landing/load-sponsors.test.ts`
Expected: FAIL — the third assertion fails (`calls` is 1, not 2) because `loadSponsors` ignores the option today.

- [ ] **Step 3: Modify the implementation**

In `lib/landing/load-sponsors.ts`, change the signature + the cache-read guard (currently lines 152-155):

```ts
export async function loadSponsors(options?: { bypassCache?: boolean }): Promise<WashedSponsors> {
  if (!options?.bypassCache && cache && cache.expiresAt > Date.now()) {
    return cache.value
  }
  // ...rest of the function unchanged...
```

Change nothing else.

- [ ] **Step 4: Run test to verify it passes**

Run: `GITHUB_TOKEN=dummy corepack yarn vp test run lib/landing/load-sponsors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/landing/load-sponsors.ts lib/landing/load-sponsors.test.ts
git commit -m "feat(sponsors-cache): loadSponsors bypassCache option"
```

---

### Task 5: KV-first cached sponsor list getter

**Files:**

- Create: `lib/landing/get-sponsors.ts`
- Test: `lib/landing/get-sponsors.test.ts`

**Interfaces:**

- Consumes: `WashedSponsors` (`./sponsors.ts`), `readData`/`KVStore` (`../sponsors-cache/store.ts`), `loadSponsors` (`./load-sponsors.ts`).
- Produces: `getCachedSponsors(kv: KVStore | undefined, loadLive?: () => Promise<WashedSponsors>): Promise<WashedSponsors>` — returns the KV `sponsors:data` snapshot if present, else calls `loadLive` (defaults to `loadSponsors`).

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
// lib/landing/get-sponsors.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getCachedSponsors } from './get-sponsors.ts'
import { DATA_KEY, type KVStore } from '../sponsors-cache/store.ts'
import type { WashedSponsors } from './sponsors.ts'

const cached: WashedSponsors = {
  specialThanks: [],
  platinum: [{ name: 'KV', img: 'i', url: 'u' }],
  gold: [],
  sliver: [],
  backers: [],
}
const live: WashedSponsors = {
  specialThanks: [],
  platinum: [{ name: 'LIVE', img: 'i', url: 'u' }],
  gold: [],
  sliver: [],
  backers: [],
}

function kvWith(entries: Record<string, string>): KVStore {
  return {
    async get(k: string) {
      return entries[k] ?? null
    },
    async put() {},
  }
}

describe('getCachedSponsors', () => {
  it('returns the KV snapshot without calling live when present', async () => {
    const loadLive = vi.fn(async () => live)
    const out = await getCachedSponsors(
      kvWith({ [DATA_KEY]: JSON.stringify(cached) }),
      loadLive,
    )
    expect(out.platinum[0].name).toBe('KV')
    expect(loadLive).not.toHaveBeenCalled()
  })
  it('falls back to live when KV is empty', async () => {
    const loadLive = vi.fn(async () => live)
    const out = await getCachedSponsors(kvWith({}), loadLive)
    expect(out.platinum[0].name).toBe('LIVE')
    expect(loadLive).toHaveBeenCalledOnce()
  })
  it('falls back to live when KV binding is missing', async () => {
    const loadLive = vi.fn(async () => live)
    const out = await getCachedSponsors(undefined, loadLive)
    expect(out.platinum[0].name).toBe('LIVE')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn vp test run lib/landing/get-sponsors.test.ts`
Expected: FAIL — cannot resolve `./get-sponsors.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/landing/get-sponsors.ts
// KV-first sponsor list for consumers (landing loaders + the image cold path):
// return the cron/webhook-maintained snapshot when present, else the live GitHub
// fetch so the site still works before the first refresh.

import type { WashedSponsors } from './sponsors.ts'
import { readData, type KVStore } from '../sponsors-cache/store.ts'
import { loadSponsors } from './load-sponsors.ts'

export async function getCachedSponsors(
  kv: KVStore | undefined,
  loadLive: () => Promise<WashedSponsors> = loadSponsors,
): Promise<WashedSponsors> {
  if (kv) {
    const cached = await readData(kv)
    if (cached) return cached
  }
  return loadLive()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack yarn vp test run lib/landing/get-sponsors.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/landing/get-sponsors.ts lib/landing/get-sponsors.test.ts
git commit -m "feat(sponsors-cache): KV-first getCachedSponsors"
```

---

### Task 6: Refresh pipeline (render all 4 + write snapshot)

**Files:**

- Create: `lib/sponsors-cache/refresh.ts`
- Test: `lib/sponsors-cache/refresh.test.ts`

**Interfaces:**

- Consumes: `capBackers`, `renderSvg`, `CARD_WIDTH`, `ensureYoga` (`../sponsors-image/card.ts`); `ensureResvg`, `svgToPng` (`../sponsors-image/resvg.ts`); `inlineSponsorAvatars`, `ImageFetcher` (`../sponsors-image/avatars.ts`); `SatoriFont` (`../sponsors-image/fonts.ts`); `WashedSponsors` (`../landing/sponsors.ts`); `writeSnapshot`, `readManifest`, `KVStore`, `R2Store`, `RenderedImage` (`./store.ts`).
- Produces: `hashSponsors(data: WashedSponsors): Promise<string>`; `RefreshDeps`; `RefreshResult = { version: string; changed: boolean; imageCount: number }`; `refreshSponsorsCache(deps: RefreshDeps): Promise<RefreshResult>`.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
// lib/sponsors-cache/refresh.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  refreshSponsorsCache,
  hashSponsors,
  type RefreshDeps,
} from './refresh.ts'
import {
  readManifest,
  readImage,
  readData,
  type KVStore,
  type R2Store,
} from './store.ts'
import { ensureYoga } from '../sponsors-image/card.ts'
import { ensureResvg } from '../sponsors-image/resvg.ts'
import type { SatoriFont } from '../sponsors-image/fonts.ts'
import type { ImageFetcher } from '../sponsors-image/avatars.ts'
import type { WashedSponsors } from '../landing/sponsors.ts'

const yogaMod = new WebAssembly.Module(
  readFileSync('node_modules/satori/yoga.wasm'),
)
const resvgMod = new WebAssembly.Module(
  readFileSync('node_modules/@resvg/resvg-wasm/index_bg.wasm'),
)
const onePng = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
)

function fonts(): SatoriFont[] {
  const toAB = (b: Buffer): ArrayBuffer =>
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
  return [
    {
      name: 'Manrope',
      data: toAB(readFileSync('public/fonts/Manrope_700Bold.ttf')),
      weight: 700,
      style: 'normal',
    },
    {
      name: 'Manrope',
      data: toAB(readFileSync('public/fonts/Manrope_500Medium.ttf')),
      weight: 500,
      style: 'normal',
    },
  ]
}
function fakeKV(): KVStore & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    async get(k) {
      return store.get(k) ?? null
    },
    async put(k, v) {
      store.set(k, v)
    },
  }
}
function fakeR2(): R2Store & { store: Map<string, Uint8Array> } {
  const store = new Map<string, Uint8Array>()
  return {
    store,
    async get(k) {
      const b = store.get(k)
      return b
        ? {
            async arrayBuffer() {
              return b.buffer.slice(
                b.byteOffset,
                b.byteOffset + b.byteLength,
              ) as ArrayBuffer
            },
          }
        : null
    },
    async put(k, v) {
      store.set(
        k,
        v instanceof ArrayBuffer
          ? new Uint8Array(v)
          : new Uint8Array((v as ArrayBufferView).buffer),
      )
    },
    async delete(k) {
      for (const x of Array.isArray(k) ? k : [k]) store.delete(x)
    },
  }
}
const fetchImage: ImageFetcher = async () =>
  new Response(onePng, {
    status: 200,
    headers: { 'content-type': 'image/png' },
  })
const sponsors: WashedSponsors = {
  specialThanks: [],
  platinum: [
    { name: 'A', img: 'https://x/a.png', url: 'https://github.com/a' },
  ],
  gold: [],
  sliver: [],
  backers: [],
}

function deps(
  kv: KVStore,
  r2: R2Store,
  over: Partial<RefreshDeps> = {},
): RefreshDeps {
  return {
    kv,
    r2,
    loadFresh: async () => sponsors,
    loadFonts: async () => fonts(),
    fetchImage,
    yogaWasm: yogaMod,
    resvgWasm: resvgMod,
    ...over,
  }
}

beforeAll(async () => {
  await ensureYoga(yogaMod)
  await ensureResvg(resvgMod)
})

describe('refreshSponsorsCache', () => {
  it('renders 4 images, writes data + manifest + R2, and reports changed', async () => {
    const kv = fakeKV(),
      r2 = fakeR2()
    const result = await refreshSponsorsCache(deps(kv, r2))
    expect(result.changed).toBe(true)
    expect(result.imageCount).toBe(4)
    expect(r2.store.size).toBe(4)
    expect((await readData(kv))?.platinum[0].name).toBe('A')
    const png = await readImage(kv, r2, 'png', 'dark')
    expect([...png!.body.slice(0, 8)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ])
    const svg = await readImage(kv, r2, 'svg', 'light')
    expect(new TextDecoder().decode(svg!.body).startsWith('<svg')).toBe(true)
    expect((await readManifest(kv))?.version).toBe(result.version)
  })

  it('skips re-render when the data hash is unchanged and force is false', async () => {
    const kv = fakeKV(),
      r2 = fakeR2()
    await refreshSponsorsCache(deps(kv, r2))
    const second = await refreshSponsorsCache(deps(kv, r2, { force: false }))
    expect(second.changed).toBe(false)
    expect(second.imageCount).toBe(0)
  })

  it('re-renders unchanged data when force is true', async () => {
    const kv = fakeKV(),
      r2 = fakeR2()
    await refreshSponsorsCache(deps(kv, r2))
    const forced = await refreshSponsorsCache(deps(kv, r2, { force: true }))
    expect(forced.changed).toBe(true)
    expect(forced.imageCount).toBe(4)
  })

  it('hashSponsors is stable for equal data and differs for different data', async () => {
    const other: WashedSponsors = {
      ...sponsors,
      gold: [{ name: 'G', img: 'g', url: 'u' }],
    }
    expect(await hashSponsors(sponsors)).toBe(await hashSponsors(sponsors))
    expect(await hashSponsors(sponsors)).not.toBe(await hashSponsors(other))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn vp test run lib/sponsors-cache/refresh.test.ts`
Expected: FAIL — cannot resolve `./refresh.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/sponsors-cache/refresh.ts
// Fetch the live sponsor list, render the 4 image blobs (svg/png x light/dark)
// once, and publish a new cache snapshot (KV data + manifest, R2 blobs). Skips
// re-rendering when the data hash matches the current manifest (unless force).
// The caller injects the wasm modules, the fresh loader, fonts, and (optionally)
// an avatar fetcher, so this is fully unit-testable in Node.

import type { WashedSponsors } from '../landing/sponsors.ts'
import {
  capBackers,
  renderSvg,
  CARD_WIDTH,
  ensureYoga,
} from '../sponsors-image/card.ts'
import { ensureResvg, svgToPng } from '../sponsors-image/resvg.ts'
import {
  inlineSponsorAvatars,
  type ImageFetcher,
} from '../sponsors-image/avatars.ts'
import type { SatoriFont } from '../sponsors-image/fonts.ts'
import {
  writeSnapshot,
  readManifest,
  type KVStore,
  type R2Store,
  type RenderedImage,
} from './store.ts'

const PNG_SCALE = 2
const THEMES = ['light', 'dark'] as const

export interface RefreshDeps {
  kv: KVStore
  r2: R2Store
  loadFresh: () => Promise<WashedSponsors>
  loadFonts: () => Promise<SatoriFont[]>
  yogaWasm: WebAssembly.Module
  resvgWasm: WebAssembly.Module
  fetchImage?: ImageFetcher
  force?: boolean
}

export interface RefreshResult {
  version: string
  changed: boolean
  imageCount: number
}

// Short content hash (first 16 hex of SHA-256) used as the cache version + the
// R2 folder. Sponsorship changes flip it; a sponsor swapping only their avatar
// image keeps the same avatarUrl and thus the same hash (that is what the daily
// force refresh is for).
export async function hashSponsors(data: WashedSponsors): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest).slice(0, 8)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function refreshSponsorsCache(
  deps: RefreshDeps,
): Promise<RefreshResult> {
  const data = await deps.loadFresh()
  const version = await hashSponsors(data)

  if (!deps.force) {
    const current = await readManifest(deps.kv)
    if (current?.version === version) {
      return { version, changed: false, imageCount: 0 }
    }
  }

  await ensureYoga(deps.yogaWasm)
  await ensureResvg(deps.resvgWasm)
  const fonts = await deps.loadFonts()
  const inlined = await inlineSponsorAvatars(capBackers(data), deps.fetchImage)

  const images: RenderedImage[] = []
  for (const theme of THEMES) {
    const svg = await renderSvg(inlined, theme, fonts)
    images.push({
      format: 'svg',
      theme,
      body: new TextEncoder().encode(svg),
      contentType: 'image/svg+xml; charset=utf-8',
    })
    const png = svgToPng(svg, CARD_WIDTH * PNG_SCALE)
    images.push({ format: 'png', theme, body: png, contentType: 'image/png' })
  }

  await writeSnapshot(deps.kv, deps.r2, data, version, images)
  return { version, changed: true, imageCount: images.length }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack yarn vp test run lib/sponsors-cache/refresh.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/sponsors-cache/refresh.ts lib/sponsors-cache/refresh.test.ts
git commit -m "feat(sponsors-cache): refresh pipeline (render 4 + snapshot, hash-skip)"
```

---

### Task 7: Cron + webhook refresh triggers

**Files:**

- Create: `crons/refresh-sponsors.ts`
- Create: `routes/webhooks/github-sponsors.ts`

**Interfaces:**

- Consumes: `refreshSponsorsCache`/`RefreshDeps` (`../lib/sponsors-cache/refresh.ts` / `../../lib/...`), `verifyGithubSignature` (`../../lib/sponsors-cache/signature.ts`), `loadSponsors` (bypassCache), `loadFonts`/`readAsset`/`AssetsFetcher` (`lib/sponsors-image/fonts.ts`), `KVStore`/`R2Store` (`lib/sponsors-cache/store.ts`), `defineScheduled`/`defineHandler` (`void`), `env` (`void/env`).
- Produces: the daily cron job and `POST /webhooks/github-sponsors`.

This task is verified by build + a workerd `vp preview` smoke test (cron + webhook wiring can't be meaningfully unit-tested; the refresh logic is already covered by Task 6, and signature verification by Task 2).

- [ ] **Step 1: Write the cron job**

```ts
// crons/refresh-sponsors.ts
// Daily full re-render of the sponsors cache (force) so avatar/name changes that
// never fire a sponsorship webhook are still picked up. 05:00 UTC = low traffic.
import { defineScheduled } from 'void'
import yogaWasm from 'satori/yoga.wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import { loadSponsors } from '../lib/landing/load-sponsors.ts'
import {
  loadFonts,
  readAsset,
  type AssetsFetcher,
} from '../lib/sponsors-image/fonts.ts'
import { refreshSponsorsCache } from '../lib/sponsors-cache/refresh.ts'
import type { KVStore, R2Store } from '../lib/sponsors-cache/store.ts'

export const cron = '0 5 * * *'

export default defineScheduled(async (_controller, env) => {
  const e = env as unknown as {
    KV: KVStore
    STORAGE: R2Store
    ASSETS: AssetsFetcher
  }
  // The scheduled context has no request URL; the ASSETS binding serves by path,
  // so the host in the base URL is irrelevant — any absolute URL works.
  const base = 'https://napi.rs/'
  await refreshSponsorsCache({
    kv: e.KV,
    r2: e.STORAGE,
    loadFresh: () => loadSponsors({ bypassCache: true }),
    loadFonts: () => loadFonts((p) => readAsset(e.ASSETS, base, p)),
    yogaWasm,
    resvgWasm,
    force: true,
  })
})
```

- [ ] **Step 2: Write the webhook route**

```ts
// routes/webhooks/github-sponsors.ts
// POST /webhooks/github-sponsors — GitHub Sponsors webhook receiver. Verifies the
// HMAC signature over the raw body, then refreshes the cache in the background so
// we return 2xx well within GitHub's 10s deadline.
import { defineHandler } from 'void'
import { env } from 'void/env'
import yogaWasm from 'satori/yoga.wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import { verifyGithubSignature } from '../../lib/sponsors-cache/signature.ts'
import { loadSponsors } from '../../lib/landing/load-sponsors.ts'
import {
  loadFonts,
  readAsset,
  type AssetsFetcher,
} from '../../lib/sponsors-image/fonts.ts'
import { refreshSponsorsCache } from '../../lib/sponsors-cache/refresh.ts'
import type { KVStore, R2Store } from '../../lib/sponsors-cache/store.ts'

export const POST = defineHandler(async (c) => {
  const secret = env.GITHUB_SPONSORS_WEBHOOK_SECRET
  if (!secret) return c.text('webhook not configured', 503)

  const raw = await c.req.text()
  const valid = await verifyGithubSignature(
    secret,
    raw,
    c.req.header('x-hub-signature-256'),
  )
  if (!valid) return c.text('invalid signature', 401)

  if (c.req.header('x-github-event') !== 'sponsorship') return c.body(null, 204)

  const e = c.env as unknown as {
    KV: KVStore
    STORAGE: R2Store
    ASSETS: AssetsFetcher
  }
  c.executionCtx.waitUntil(
    refreshSponsorsCache({
      kv: e.KV,
      r2: e.STORAGE,
      loadFresh: () => loadSponsors({ bypassCache: true }),
      loadFonts: () => loadFonts((p) => readAsset(e.ASSETS, c.req.url, p)),
      yogaWasm,
      resvgWasm,
      force: false,
    }),
  )
  return c.body(null, 202)
})
```

- [ ] **Step 3: Build and register the cron + route**

Run:

```bash
corepack yarn void prepare
corepack yarn build 2>&1 | tail -3
node -e "const w=require('./dist/ssr/wrangler.json'); console.log('crons:', JSON.stringify(w.triggers))"
grep -q '"/webhooks/github-sponsors"' .void/routes.d.ts && echo 'webhook route registered' || echo 'MISSING webhook route'
```

Expected: build passes; `crons:` shows the `0 5 * * *` schedule (e.g. `{"crons":["0 5 * * *"]}`); "webhook route registered".

- [ ] **Step 4: Smoke-test the webhook in workerd (valid + invalid signature)**

Set a dev secret so the preview worker can read it, then exercise the route:

```bash
# Ensure a webhook secret is available to the preview worker (gitignored .env.local)
grep -q GITHUB_SPONSORS_WEBHOOK_SECRET .env.local || echo 'GITHUB_SPONSORS_WEBHOOK_SECRET=devsecret' >> .env.local
corepack yarn build >/dev/null 2>&1
(corepack yarn preview > /tmp/hook-preview.log 2>&1 &) ; sleep 7

BODY='{"action":"created","sponsorship":{"sponsor":{"login":"x"}}}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac devsecret | sed 's/^.*= //')"

echo "--- valid sig + sponsorship event (expect 202) ---"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:4173/webhooks/github-sponsors" \
  -H "content-type: application/json" -H "x-github-event: sponsorship" -H "x-hub-signature-256: $SIG" -d "$BODY"
echo "--- bad sig (expect 401) ---"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:4173/webhooks/github-sponsors" \
  -H "content-type: application/json" -H "x-github-event: sponsorship" -H "x-hub-signature-256: sha256=deadbeef" -d "$BODY"
echo "--- wrong event (expect 204) ---"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:4173/webhooks/github-sponsors" \
  -H "content-type: application/json" -H "x-github-event: ping" -H "x-hub-signature-256: $SIG" -d "$BODY"

sleep 3  # let the background refresh run
pkill -f "vite preview" 2>/dev/null; pkill -f preview 2>/dev/null
grep -iE "error|exception" /tmp/hook-preview.log | head
rm -rf dist
```

Expected: `202`, then `401`, then `204`. No errors in the log. (The valid call triggers a real background refresh against GitHub using the token in `.env.local` — it populates the local KV/R2, exercised further in Task 8.)

- [ ] **Step 5: Commit**

```bash
git add crons/refresh-sponsors.ts routes/webhooks/github-sponsors.ts
git commit -m "feat(sponsors-cache): daily cron + GitHub Sponsors webhook refresh"
```

---

### Task 8: Serve images from cache + landing reads cached list

**Files:**

- Modify: `routes/sponsors.svg.ts`, `routes/sponsors.png.ts` (full rewrite of each — shown below)
- Modify: `pages/en/index.server.ts`, `pages/cn/index.server.ts`, `pages/pt-BR/index.server.ts`

**Interfaces:**

- Consumes: `readImage`/`KVStore`/`R2Store` (`../lib/sponsors-cache/store.ts`), `refreshSponsorsCache` (`../lib/sponsors-cache/refresh.ts`), `getCachedSponsors` (`../lib/landing/get-sponsors.ts` / `../../lib/...`), plus the existing render pieces.
- Produces: cache-first `/sponsors.{svg,png}` and cache-first landing loaders.

Verified by build + workerd smoke: after a refresh populates KV/R2, the image routes return the cached bytes; a cold KV returns a live render.

- [ ] **Step 1: Rewrite `routes/sponsors.png.ts`**

```ts
// routes/sponsors.png.ts
// GET /sponsors.png — serve the cached PNG from R2 (via the KV manifest). On a
// cold cache, render this one live and kick off a full background refresh to warm
// the cache for subsequent requests. ?theme=light|dark (default light).
import { defineHandler } from 'void'
import yogaWasm from 'satori/yoga.wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import { loadSponsors } from '../lib/landing/load-sponsors.ts'
import { parseTheme } from '../lib/sponsors-image/theme.ts'
import {
  loadFonts,
  readAsset,
  type AssetsFetcher,
} from '../lib/sponsors-image/fonts.ts'
import { ensureYoga } from '../lib/sponsors-image/card.ts'
import { ensureResvg } from '../lib/sponsors-image/resvg.ts'
import { renderSponsorsImage } from '../lib/sponsors-image/render.ts'
import {
  readImage,
  type KVStore,
  type R2Store,
} from '../lib/sponsors-cache/store.ts'
import { refreshSponsorsCache } from '../lib/sponsors-cache/refresh.ts'

const CACHE_CONTROL =
  'public, s-maxage=600, max-age=600, stale-while-revalidate=86400'

export const GET = defineHandler(async (c) => {
  const theme = parseTheme(c.req.query('theme'))
  const e = c.env as unknown as {
    KV?: KVStore
    STORAGE?: R2Store
    ASSETS: AssetsFetcher
  }

  if (e.KV && e.STORAGE) {
    const cached = await readImage(e.KV, e.STORAGE, 'png', theme)
    if (cached) {
      return new Response(cached.body, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': CACHE_CONTROL,
        },
      })
    }
    // Cold cache: warm all 4 blobs in the background for next time.
    c.executionCtx.waitUntil(
      refreshSponsorsCache({
        kv: e.KV,
        r2: e.STORAGE,
        loadFresh: () => loadSponsors({ bypassCache: true }),
        loadFonts: () => loadFonts((p) => readAsset(e.ASSETS, c.req.url, p)),
        yogaWasm,
        resvgWasm,
        force: true,
      }),
    )
  }

  await ensureYoga(yogaWasm)
  await ensureResvg(resvgWasm)
  const sponsors = await loadSponsors()
  const fonts = await loadFonts((p) => readAsset(e.ASSETS, c.req.url, p))
  const { body, contentType } = await renderSponsorsImage({
    format: 'png',
    theme,
    sponsors,
    fonts,
  })
  return new Response(body, {
    headers: { 'Content-Type': contentType, 'Cache-Control': CACHE_CONTROL },
  })
})
```

- [ ] **Step 2: Rewrite `routes/sponsors.svg.ts`**

```ts
// routes/sponsors.svg.ts
// GET /sponsors.svg — serve the cached SVG from R2 (via the KV manifest); cold
// cache → render live + background warm. ?theme=light|dark (default light).
import { defineHandler } from 'void'
import yogaWasm from 'satori/yoga.wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import { loadSponsors } from '../lib/landing/load-sponsors.ts'
import { parseTheme } from '../lib/sponsors-image/theme.ts'
import {
  loadFonts,
  readAsset,
  type AssetsFetcher,
} from '../lib/sponsors-image/fonts.ts'
import { ensureYoga } from '../lib/sponsors-image/card.ts'
import { renderSponsorsImage } from '../lib/sponsors-image/render.ts'
import {
  readImage,
  type KVStore,
  type R2Store,
} from '../lib/sponsors-cache/store.ts'
import { refreshSponsorsCache } from '../lib/sponsors-cache/refresh.ts'

const CACHE_CONTROL =
  'public, s-maxage=600, max-age=600, stale-while-revalidate=86400'

export const GET = defineHandler(async (c) => {
  const theme = parseTheme(c.req.query('theme'))
  const e = c.env as unknown as {
    KV?: KVStore
    STORAGE?: R2Store
    ASSETS: AssetsFetcher
  }

  if (e.KV && e.STORAGE) {
    const cached = await readImage(e.KV, e.STORAGE, 'svg', theme)
    if (cached) {
      return new Response(cached.body, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': CACHE_CONTROL,
        },
      })
    }
    c.executionCtx.waitUntil(
      refreshSponsorsCache({
        kv: e.KV,
        r2: e.STORAGE,
        loadFresh: () => loadSponsors({ bypassCache: true }),
        loadFonts: () => loadFonts((p) => readAsset(e.ASSETS, c.req.url, p)),
        yogaWasm,
        resvgWasm,
        force: true,
      }),
    )
  }

  await ensureYoga(yogaWasm)
  const sponsors = await loadSponsors()
  const fonts = await loadFonts((p) => readAsset(e.ASSETS, c.req.url, p))
  const { body, contentType } = await renderSponsorsImage({
    format: 'svg',
    theme,
    sponsors,
    fonts,
  })
  return new Response(body, {
    headers: { 'Content-Type': contentType, 'Cache-Control': CACHE_CONTROL },
  })
})
```

- [ ] **Step 3: Point the landing loaders at the cached list**

Each of `pages/en/index.server.ts`, `pages/cn/index.server.ts`, `pages/pt-BR/index.server.ts` currently has a loader like:

```ts
export const loader = defineHandler(async () => ({
  sponsors: await loadSponsors(),
}))
```

For EACH file: (a) replace the `loadSponsors` import line

```ts
import { loadSponsors } from '../../lib/landing/load-sponsors.ts'
```

with

```ts
import { getCachedSponsors } from '../../lib/landing/get-sponsors.ts'
import type { KVStore } from '../../lib/sponsors-cache/store.ts'
```

and (b) change the loader body to read the KV binding off the context:

```ts
export const loader = defineHandler(async (c) => ({
  sponsors: await getCachedSponsors((c.env as unknown as { KV?: KVStore }).KV),
}))
```

Keep everything else in each file (the `head`, `Props`, `prerender`, etc.) exactly as-is. Note the relative import depth is `../../lib/...` from `pages/<locale>/`.

- [ ] **Step 4: Build + smoke the full cache path in workerd**

Run:

```bash
corepack yarn build 2>&1 | tail -3
(corepack yarn preview > /tmp/cache-preview.log 2>&1 &) ; sleep 7

echo "--- cold PNG (live render, 200) ---"
curl -s -o /tmp/cold.png -m 40 -w "http %{http_code} %{content_type}\n" "http://localhost:4173/sponsors.png"
sleep 4  # let the background warm refresh finish

echo "--- warm PNG (from R2 cache, 200 image/png, valid magic) ---"
curl -s -o /tmp/warm.png -m 40 -w "http %{http_code} %{content_type} %{size_download}B\n" "http://localhost:4173/sponsors.png"
xxd -l 8 /tmp/warm.png
echo "--- warm SVG dark ---"
curl -s -o /tmp/warm.svg -m 40 -w "http %{http_code} %{content_type}\n" "http://localhost:4173/sponsors.svg?theme=dark"
head -c 40 /tmp/warm.svg; echo
echo "--- landing renders (200, has sponsor markup) ---"
curl -s -m 40 "http://localhost:4173/" | grep -c -i "sponsor" | sed 's/^/sponsor mentions: /'

pkill -f "vite preview" 2>/dev/null; pkill -f preview 2>/dev/null
grep -iE "error|exception" /tmp/cache-preview.log | head
rm -rf dist
```

Expected: cold PNG `200 image/png`; warm PNG `200 image/png` with magic `8950 4e47 0d0a 1a0a` and size > 2 KB; warm SVG `200 image/svg+xml…` starting `<svg`; landing returns 200 with sponsor markup; no errors in the log.

- [ ] **Step 5: Run the full unit suite (no regressions) and commit**

```bash
GITHUB_TOKEN=dummy corepack yarn vp test run 2>&1 | tail -3
git add routes/sponsors.svg.ts routes/sponsors.png.ts pages/en/index.server.ts pages/cn/index.server.ts pages/pt-BR/index.server.ts
git commit -m "feat(sponsors-cache): serve images from cache; landing reads cached list"
```

Expected: full suite green.

---

## Ops runbook (one-time, done by a human — NOT part of the coded tasks)

1. `void secret put GITHUB_SPONSORS_WEBHOOK_SECRET` (a high-entropy random string); also add it to `.env.local` for local dev.
2. GitHub → **Your sponsors** → `napi-rs` **Dashboard** → **Webhooks** → **Add webhook**: Payload URL `https://napi.rs/webhooks/github-sponsors`, content type `application/json`, Secret = the same value, events = the default (`sponsorship`).
3. KV + R2 are auto-provisioned by `void deploy` (from the `void.json` binding flags). Ensure `GITHUB_TOKEN` (classic PAT, `read:org`+`read:user`) is set as a Void secret so the refresh can fetch the list.

## Self-Review

**Spec coverage:** cache (KV data + R2 images via KV manifest) → Tasks 1,3; webhook (verified, waitUntil) → Tasks 2,7; cron (daily force) → Task 7; hash-skip "unchanged" → Task 6; serve-from-cache + cold warm → Task 8; landing reads cached list → Task 8; fresh fetch for refresh → Task 4; KV-first getter → Task 5. ✅

**Placeholder scan:** none — every code step is complete.

**Type consistency:** `KVStore`/`R2Store`/`SponsorsManifest`/`RenderedImage`/`ImageFormat`/`ImageTheme` defined once in `store.ts` (Task 3) and consumed unchanged by refresh/routes/cron/webhook. `RefreshDeps`/`RefreshResult`/`refreshSponsorsCache`/`hashSponsors` defined in Task 6 and consumed in Tasks 7,8. `getCachedSponsors` defined Task 5, consumed Task 8. `loadSponsors({bypassCache})` defined Task 4, consumed Tasks 6-wiring,7,8. `verifyGithubSignature` defined Task 2, consumed Task 7. ✅

**Ordering:** Task 3 (store) before 5,6 (import it); Task 2 (signature) before 7; Task 4 (bypassCache) before 7,8 wiring; Task 6 (refresh) before 7,8. Task 1 (bindings) first. Correct.
