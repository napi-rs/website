# Sponsors Image Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the napi-rs sponsor wall as an embeddable image at `GET /sponsors.svg` and `GET /sponsors.png` so it renders in GitHub, npm, and crates.io READMEs.

**Architecture:** Two runtime Void route handlers reuse the existing live `loadSponsors()`, fetch + base64-inline each avatar, render an avatar-wall card with `satori` (→ SVG, text vectorized to `<path>`), and for the PNG path rasterize that SVG with `@resvg/resvg-wasm` on the Cloudflare edge. Both wasm modules (`satori/yoga.wasm`, `@resvg/resvg-wasm/index_bg.wasm`) are statically imported by the route files — Void's Cloudflare build turns them into real `WebAssembly.Module` objects at the edge (verified). Heavy logic lives in small `lib/sponsors-image/*` units; the route files are thin adapters.

**Tech Stack:** Void 0.10.x (Cloudflare Worker, Hono route handlers), `satori@0.26.0` (already installed, `satori/standalone` entry for manual yoga init), `@resvg/resvg-wasm@2.6.2` (new dep), Manrope TTFs vendored from `@expo-google-fonts/manrope`, vitest via `vp test`.

## Global Constraints

These bind every task. Exact values, copied verbatim.

- **Endpoints:** `GET /sponsors.svg` (`Content-Type: image/svg+xml; charset=utf-8`) and `GET /sponsors.png` (`Content-Type: image/png`). Query param `?theme=light|dark`, **default `light`** (any value other than `dark` → `light`).
- **`Cache-Control` on both responses:** `public, s-maxage=1800, max-age=600, stale-while-revalidate=86400`.
- **Data source:** the existing `loadSponsors()` from `lib/landing/load-sponsors.ts` — `loadSponsors(): Promise<WashedSponsors>`, no args, already 10-min in-isolate cached and never throws (degrades to empty tiers). Do NOT re-implement sponsor fetching.
- **Tier data keys (from `lib/landing/sponsors.ts`), in render order:** `specialThanks`, `platinum`, `gold`, `sliver`, `backers`. **The `sliver` misspelling is the real data key — never rename it.** Its human-facing label is `SILVER`.
- **satori entry:** `import satori, { init } from 'satori/standalone'`. Call `init(yogaModule)` once before `satori(...)`. Keep satori's default font embedding (text renders as `<path>`), so **resvg needs no fonts**.
- **resvg entry:** `import { initWasm, Resvg } from '@resvg/resvg-wasm'`. Call `initWasm(resvgModule)` once. Render with `new Resvg(svg, { fitTo: { mode: 'width', value } }).render().asPng()` → `Uint8Array`.
- **wasm imports live in the route files only** (`import wasm from '….wasm'` → `WebAssembly.Module` on the edge). `lib/` units receive a `WebAssembly.Module` as a parameter and never import `.wasm`, so they stay unit-testable in Node.
- **Avatars MUST be base64 data-URI inlined** before rendering: GitHub proxies README images through Camo (external `<image href>` blocked) and the edge/resvg cannot fetch external images. Request PNG/JPEG (satori/resvg can't decode WebP); drop any avatar that fails to fetch or returns a non-`image/(png|jpeg|gif)` type.
- **Fonts:** Manrope only — `Manrope` weight 700 (headings) and weight 500 (labels/wordmark). Vendor the two TTFs into `public/fonts/` and load them at runtime via the `ASSETS` binding. Do not add Inter or Noto Sans SC (no rendered sponsor names → no CJK).
- **New dependency:** `@resvg/resvg-wasm@2.6.2` (exact). `satori@0.26.0` is already present.
- **Card width:** 800 CSS px (satori derives height). PNG rasterized at 2× (`fitTo` width 1600).
- **Test runner:** `corepack yarn vp test run <path>` (vitest 4). Unit tests need no `GITHUB_TOKEN`. Add `// @vitest-environment node` to any test using `node:fs` / `WebAssembly`.
- **Never commit** `dist/`, `.env.local`, `node_modules`, `.void/` (all gitignored).

## File Structure

```
lib/sponsors-image/
  theme.ts        Theme type, THEMES tokens, parseTheme()            [Task 1]
  avatars.ts      inlineSponsorAvatars(), bytesToBase64()            [Task 2]
  fonts.ts        loadFonts() (cached), readAsset() ASSETS helper    [Task 3]
  card.ts         ensureYoga(), renderSvg(), CARD_WIDTH              [Task 4]
  resvg.ts        ensureResvg(), svgToPng()                          [Task 5]
  render.ts       renderSponsorsImage() orchestrator                 [Task 6]
  wasm.d.ts       ambient `declare module '*.wasm'`                  [Task 7]
  *.test.ts       co-located unit tests
routes/
  sponsors.svg.ts thin adapter → SVG                                 [Task 7]
  sponsors.png.ts thin adapter → PNG                                 [Task 7]
public/fonts/
  Manrope_700Bold.ttf, Manrope_500Medium.ttf   (vendored, committed) [Task 3]
package.json      + @resvg/resvg-wasm@2.6.2                          [Task 5]
```

---

### Task 1: Theme tokens

**Files:**

- Create: `lib/sponsors-image/theme.ts`
- Test: `lib/sponsors-image/theme.test.ts`

**Interfaces:**

- Produces: `type Theme = 'light' | 'dark'`; `interface ThemeTokens { bg: string; fg: string; muted: string; accent: string; border: string }`; `const THEMES: Record<Theme, ThemeTokens>`; `function parseTheme(value: string | null | undefined): Theme`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/sponsors-image/theme.test.ts
import { describe, it, expect } from 'vitest'
import { parseTheme, THEMES } from './theme.ts'

describe('parseTheme', () => {
  it('defaults to light for missing/unknown values', () => {
    expect(parseTheme(undefined)).toBe('light')
    expect(parseTheme(null)).toBe('light')
    expect(parseTheme('')).toBe('light')
    expect(parseTheme('LIGHT')).toBe('light')
    expect(parseTheme('purple')).toBe('light')
  })
  it('returns dark only for exactly "dark"', () => {
    expect(parseTheme('dark')).toBe('dark')
  })
})

describe('THEMES', () => {
  it('has light and dark token sets with all keys', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const key of ['bg', 'fg', 'muted', 'accent', 'border'] as const) {
        expect(THEMES[theme][key]).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
    expect(THEMES.light.bg).not.toBe(THEMES.dark.bg)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn vp test run lib/sponsors-image/theme.test.ts`
Expected: FAIL — cannot resolve `./theme.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/sponsors-image/theme.ts
// Theme tokens for the sponsors card. Two solid-background variants so the
// image is legible on both light and dark README surfaces (GitHub/npm/crates).
// `?theme=dark` opts into the dark variant; anything else is light.

export type Theme = 'light' | 'dark'

export interface ThemeTokens {
  bg: string
  fg: string
  muted: string
  accent: string
  border: string
}

export const THEMES: Record<Theme, ThemeTokens> = {
  light: {
    bg: '#ffffff',
    fg: '#0f172a',
    muted: '#64748b',
    accent: '#e66000',
    border: '#e2e8f0',
  },
  dark: {
    bg: '#0b0d10',
    fg: '#f8fafc',
    muted: '#94a3b8',
    accent: '#f97316',
    border: '#1f2937',
  },
}

export function parseTheme(value: string | null | undefined): Theme {
  return value === 'dark' ? 'dark' : 'light'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack yarn vp test run lib/sponsors-image/theme.test.ts`
Expected: PASS (2 files? no — 1 file, all tests pass).

- [ ] **Step 5: Commit**

```bash
git add lib/sponsors-image/theme.ts lib/sponsors-image/theme.test.ts
git commit -m "feat(sponsors-image): theme tokens + parseTheme"
```

---

### Task 2: Avatar inlining

**Files:**

- Create: `lib/sponsors-image/avatars.ts`
- Test: `lib/sponsors-image/avatars.test.ts`

**Interfaces:**

- Consumes: `WashedSponsors`, `WashedSponsor` from `lib/landing/sponsors.ts` (`WashedSponsor = { name: string; img: string; url: string }`; `WashedSponsors` has the five tier arrays).
- Produces: `type ImageFetcher = (url: string) => Promise<Response>`; `function bytesToBase64(bytes: Uint8Array): string`; `function inlineSponsorAvatars(sponsors: WashedSponsors, fetchImage?: ImageFetcher): Promise<WashedSponsors>` — returns a new `WashedSponsors` where every remaining sponsor's `img` is a `data:image/...;base64,...` URI. Sponsors whose avatar fails to fetch or is a non-`image/(png|jpeg|gif)` type are dropped from their tier.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
// lib/sponsors-image/avatars.test.ts
import { describe, it, expect, vi } from 'vitest'
import {
  inlineSponsorAvatars,
  bytesToBase64,
  type ImageFetcher,
} from './avatars.ts'
import type { WashedSponsors } from '../landing/sponsors.ts'

function emptyTiers(): WashedSponsors {
  return { specialThanks: [], platinum: [], gold: [], sliver: [], backers: [] }
}
function pngResponse(bytes = new Uint8Array([1, 2, 3, 4])): Response {
  return new Response(bytes, {
    status: 200,
    headers: { 'content-type': 'image/png' },
  })
}

describe('bytesToBase64', () => {
  it('round-trips through atob', () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255])
    const b64 = bytesToBase64(bytes)
    const back = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    expect([...back]).toEqual([...bytes])
  })
})

describe('inlineSponsorAvatars', () => {
  it('replaces each img with a base64 data URI and preserves name/url', async () => {
    const sponsors: WashedSponsors = {
      ...emptyTiers(),
      platinum: [
        { name: 'A', img: 'https://x/a.png', url: 'https://github.com/a' },
      ],
    }
    const fetchImage: ImageFetcher = vi.fn(async () => pngResponse())
    const out = await inlineSponsorAvatars(sponsors, fetchImage)
    expect(out.platinum).toHaveLength(1)
    expect(out.platinum[0].img).toMatch(/^data:image\/png;base64,/)
    expect(out.platinum[0].name).toBe('A')
    expect(out.platinum[0].url).toBe('https://github.com/a')
  })

  it('drops sponsors whose avatar fails to fetch or is not a raster image', async () => {
    const sponsors: WashedSponsors = {
      ...emptyTiers(),
      gold: [
        { name: 'ok', img: 'https://x/ok.png', url: 'https://github.com/ok' },
        {
          name: 'notfound',
          img: 'https://x/404.png',
          url: 'https://github.com/nf',
        },
        { name: 'webp', img: 'https://x/w.webp', url: 'https://github.com/w' },
        { name: 'threw', img: 'https://x/boom', url: 'https://github.com/t' },
      ],
    }
    const fetchImage: ImageFetcher = async (url) => {
      if (url.includes('404')) return new Response('', { status: 404 })
      if (url.includes('.webp'))
        return new Response(new Uint8Array([1]), {
          status: 200,
          headers: { 'content-type': 'image/webp' },
        })
      if (url.includes('boom')) throw new Error('network')
      return pngResponse()
    }
    const out = await inlineSponsorAvatars(sponsors, fetchImage)
    expect(out.gold.map((s) => s.name)).toEqual(['ok'])
  })

  it('requests a sized avatar from githubusercontent hosts', async () => {
    const sponsors: WashedSponsors = {
      ...emptyTiers(),
      backers: [
        {
          name: 'g',
          img: 'https://avatars.githubusercontent.com/u/1?v=4',
          url: 'https://github.com/g',
        },
      ],
    }
    const seen: string[] = []
    const fetchImage: ImageFetcher = async (url) => {
      seen.push(url)
      return pngResponse()
    }
    await inlineSponsorAvatars(sponsors, fetchImage)
    expect(seen[0]).toContain('s=120')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn vp test run lib/sponsors-image/avatars.test.ts`
Expected: FAIL — cannot resolve `./avatars.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/sponsors-image/avatars.ts
// Fetch each sponsor avatar and inline it as a base64 data URI. Required because
// GitHub's Camo proxy blocks external <image href> in README SVGs, and the edge
// runtime / resvg cannot fetch external images while rasterizing. We request
// PNG/JPEG (satori & resvg can't decode WebP) and drop any avatar that fails.

import type { WashedSponsors, WashedSponsor } from '../landing/sponsors.ts'

const TIERS = [
  'specialThanks',
  'platinum',
  'gold',
  'sliver',
  'backers',
] as const

export type ImageFetcher = (url: string) => Promise<Response>

const DEFAULT_FETCH: ImageFetcher = (url) =>
  fetch(url, {
    headers: { accept: 'image/png,image/jpeg;q=0.9,image/*;q=0.8' },
  })

// Uint8Array -> base64 using btoa (available in workerd + Node). Chunked so a
// large avatar doesn't blow the argument-count limit of String.fromCharCode.
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// Append `s=120` for github avatar hosts to shrink the payload; leave other
// hosts untouched. Never throws — a malformed URL is returned as-is.
function sizedAvatarUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.endsWith('githubusercontent.com'))
      u.searchParams.set('s', '120')
    return u.toString()
  } catch {
    return url
  }
}

async function inlineOne(
  sponsor: WashedSponsor,
  fetchImage: ImageFetcher,
): Promise<WashedSponsor | null> {
  try {
    const res = await fetchImage(sizedAvatarUrl(sponsor.img))
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? ''
    if (!/^image\/(png|jpe?g|gif)/i.test(contentType)) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    return {
      ...sponsor,
      img: `data:${contentType};base64,${bytesToBase64(bytes)}`,
    }
  } catch {
    return null
  }
}

export async function inlineSponsorAvatars(
  sponsors: WashedSponsors,
  fetchImage: ImageFetcher = DEFAULT_FETCH,
): Promise<WashedSponsors> {
  const result = {} as WashedSponsors
  for (const tier of TIERS) {
    const inlined = await Promise.all(
      sponsors[tier].map((s) => inlineOne(s, fetchImage)),
    )
    result[tier] = inlined.filter((s): s is WashedSponsor => s !== null)
  }
  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack yarn vp test run lib/sponsors-image/avatars.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/sponsors-image/avatars.ts lib/sponsors-image/avatars.test.ts
git commit -m "feat(sponsors-image): base64-inline sponsor avatars"
```

---

### Task 3: Font loader + vendored TTFs

**Files:**

- Create: `lib/sponsors-image/fonts.ts`
- Test: `lib/sponsors-image/fonts.test.ts`
- Add (binary, committed): `public/fonts/Manrope_700Bold.ttf`, `public/fonts/Manrope_500Medium.ttf`

**Interfaces:**

- Produces: `interface SatoriFont { name: string; data: ArrayBuffer; weight: number; style: 'normal' }`; `type AssetReader = (path: string) => Promise<ArrayBuffer>`; `function loadFonts(read: AssetReader): Promise<SatoriFont[]>` (module-cached; loads Manrope 700 + 500 from `/fonts/...`); `function readAsset(assets: AssetsFetcher, baseUrl: string, path: string): Promise<ArrayBuffer>` where `type AssetsFetcher = { fetch(input: URL): Promise<Response> }`.

- [ ] **Step 1: Vendor the font files**

```bash
mkdir -p public/fonts
cp node_modules/@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf public/fonts/Manrope_700Bold.ttf
cp node_modules/@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf public/fonts/Manrope_500Medium.ttf
ls -la public/fonts/
```

Expected: two `.ttf` files, ~96 KB and ~96 KB, non-empty.

- [ ] **Step 2: Write the failing test**

```ts
// @vitest-environment node
// lib/sponsors-image/fonts.test.ts
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { loadFonts, readAsset, type AssetReader } from './fonts.ts'

const bold = readFileSync('public/fonts/Manrope_700Bold.ttf')
const medium = readFileSync('public/fonts/Manrope_500Medium.ttf')

function bufferFor(path: string): ArrayBuffer {
  const buf = path.includes('700') ? bold : medium
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

describe('loadFonts', () => {
  it('returns Manrope 700 + 500 descriptors', async () => {
    const read: AssetReader = vi.fn(async (p) => bufferFor(p))
    const fonts = await loadFonts(read)
    expect(fonts.map((f) => [f.name, f.weight, f.style])).toEqual([
      ['Manrope', 700, 'normal'],
      ['Manrope', 500, 'normal'],
    ])
    expect(fonts[0].data.byteLength).toBeGreaterThan(1000)
  })

  it('caches after the first successful load', async () => {
    const read: AssetReader = vi.fn(async (p) => bufferFor(p))
    await loadFonts(read)
    await loadFonts(read)
    // 2 reads on the first call (700 + 500), 0 on the cached second call
    expect(read).toHaveBeenCalledTimes(2)
  })
})

describe('readAsset', () => {
  it('fetches path against baseUrl and returns arrayBuffer', async () => {
    const assets = {
      fetch: vi.fn(async (input: URL) => {
        expect(input.toString()).toBe('https://napi.rs/fonts/x.ttf')
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
      }),
    }
    const buf = await readAsset(
      assets,
      'https://napi.rs/sponsors.png',
      '/fonts/x.ttf',
    )
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('throws on a non-ok asset response', async () => {
    const assets = {
      fetch: vi.fn(async () => new Response('', { status: 404 })),
    }
    await expect(
      readAsset(assets, 'https://napi.rs/', '/fonts/missing.ttf'),
    ).rejects.toThrow()
  })
})
```

Note: `loadFonts` is module-cached, so the two `loadFonts` tests share one cache. Keep them in this order (first populates, second asserts the cache). The `readAsset` tests are independent.

- [ ] **Step 3: Run test to verify it fails**

Run: `corepack yarn vp test run lib/sponsors-image/fonts.test.ts`
Expected: FAIL — cannot resolve `./fonts.ts`.

- [ ] **Step 4: Write minimal implementation**

```ts
// lib/sponsors-image/fonts.ts
// Load the Manrope TTFs the card needs, at runtime, from the worker's own static
// assets (public/fonts/*.ttf served via the ASSETS binding). satori has no system
// fonts and needs raw TTF/OTF buffers (not woff2). Cached per isolate so we read
// each font once. A failed load clears the cache so the next request can retry.

export interface SatoriFont {
  name: string
  data: ArrayBuffer
  weight: number
  style: 'normal'
}

export type AssetReader = (path: string) => Promise<ArrayBuffer>

export type AssetsFetcher = { fetch(input: URL): Promise<Response> }

let cache: Promise<SatoriFont[]> | null = null

export function loadFonts(read: AssetReader): Promise<SatoriFont[]> {
  if (!cache) {
    cache = load(read).catch((err) => {
      cache = null
      throw err
    })
  }
  return cache
}

async function load(read: AssetReader): Promise<SatoriFont[]> {
  const [bold, medium] = await Promise.all([
    read('/fonts/Manrope_700Bold.ttf'),
    read('/fonts/Manrope_500Medium.ttf'),
  ])
  return [
    { name: 'Manrope', data: bold, weight: 700, style: 'normal' },
    { name: 'Manrope', data: medium, weight: 500, style: 'normal' },
  ]
}

// Read a static asset (e.g. a font) from the worker's ASSETS binding. `path` is
// an absolute path like `/fonts/x.ttf`, resolved against the current request URL.
export function readAsset(
  assets: AssetsFetcher,
  baseUrl: string,
  path: string,
): Promise<ArrayBuffer> {
  return assets.fetch(new URL(path, baseUrl)).then((res) => {
    if (!res.ok) throw new Error(`asset ${path} failed: ${res.status}`)
    return res.arrayBuffer()
  })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `corepack yarn vp test run lib/sponsors-image/fonts.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/sponsors-image/fonts.ts lib/sponsors-image/fonts.test.ts public/fonts/Manrope_700Bold.ttf public/fonts/Manrope_500Medium.ttf
git commit -m "feat(sponsors-image): runtime Manrope font loader + vendored TTFs"
```

---

### Task 4: Card renderer (satori → SVG)

**Files:**

- Create: `lib/sponsors-image/card.ts`
- Test: `lib/sponsors-image/card.test.ts`

**Interfaces:**

- Consumes: `WashedSponsors` (`lib/landing/sponsors.ts`), `SatoriFont` (`./fonts.ts`), `Theme`/`THEMES` (`./theme.ts`).
- Produces: `const CARD_WIDTH = 800`; `function ensureYoga(wasm: WebAssembly.Module): Promise<void>` (guarded, calls satori `init` once); `function renderSvg(sponsors: WashedSponsors, theme: Theme, fonts: SatoriFont[]): Promise<string>` (returns an `<svg …>` string; assumes `ensureYoga` already resolved).

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
// lib/sponsors-image/card.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { ensureYoga, renderSvg, CARD_WIDTH } from './card.ts'
import type { SatoriFont } from './fonts.ts'
import type { WashedSponsors } from '../landing/sponsors.ts'

// 1x1 transparent PNG data URI — a valid inlined avatar for satori to embed.
const dot =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

function fonts(): SatoriFont[] {
  const bold = readFileSync('public/fonts/Manrope_700Bold.ttf')
  const medium = readFileSync('public/fonts/Manrope_500Medium.ttf')
  const toAB = (b: Buffer) =>
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
  return [
    { name: 'Manrope', data: toAB(bold), weight: 700, style: 'normal' },
    { name: 'Manrope', data: toAB(medium), weight: 500, style: 'normal' },
  ]
}
function empty(): WashedSponsors {
  return { specialThanks: [], platinum: [], gold: [], sliver: [], backers: [] }
}

beforeAll(async () => {
  await ensureYoga(
    new WebAssembly.Module(readFileSync('node_modules/satori/yoga.wasm')),
  )
})

describe('renderSvg', () => {
  it('renders an svg of the configured width containing one <image> per sponsor', async () => {
    const sponsors: WashedSponsors = {
      ...empty(),
      platinum: [{ name: 'A', img: dot, url: 'https://github.com/a' }],
      gold: [
        { name: 'B', img: dot, url: 'https://github.com/b' },
        { name: 'C', img: dot, url: 'https://github.com/c' },
      ],
    }
    const svg = await renderSvg(sponsors, 'light', fonts())
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain(`width="${CARD_WIDTH}"`)
    expect((svg.match(/<image/g) ?? []).length).toBe(3)
  })

  it('renders header-only svg (no <image>) when there are no sponsors', async () => {
    const svg = await renderSvg(empty(), 'dark', fonts())
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.includes('<image')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn vp test run lib/sponsors-image/card.test.ts`
Expected: FAIL — cannot resolve `./card.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/sponsors-image/card.ts
// Build the sponsor-wall card with satori (React-less: plain {type,props} nodes)
// and render it to an SVG string. satori embeds fonts as vector <path> and inlined
// avatars as base64 <image>, so the SVG is fully self-contained (Camo-safe) and
// resvg needs no fonts to rasterize it. Uses the `satori/standalone` entry so we
// control yoga init explicitly (required on the Cloudflare edge).

import satori, { init } from 'satori/standalone'
import type { WashedSponsors, WashedSponsor } from '../landing/sponsors.ts'
import type { SatoriFont } from './fonts.ts'
import { THEMES, type Theme, type ThemeTokens } from './theme.ts'

export const CARD_WIDTH = 800

// Bound the backers row so a large tier can't explode avatar fan-out / image height.
const MAX_BACKERS = 100

interface TierSpec {
  key: keyof WashedSponsors
  label: string
  size: number
}

const TIER_SPECS: TierSpec[] = [
  { key: 'specialThanks', label: 'SPECIAL THANKS', size: 64 },
  { key: 'platinum', label: 'PLATINUM', size: 64 },
  { key: 'gold', label: 'GOLD', size: 48 },
  { key: 'sliver', label: 'SILVER', size: 36 },
  { key: 'backers', label: 'BACKERS', size: 28 },
]

let yogaReady: Promise<void> | null = null

export function ensureYoga(wasm: WebAssembly.Module): Promise<void> {
  if (!yogaReady) yogaReady = init(wasm)
  return yogaReady
}

// satori node helpers (avoids a JSX runtime; matches the spike-verified shape).
type Node = { type: string; props: Record<string, unknown> }

function avatar(sponsor: WashedSponsor, size: number): Node {
  return {
    type: 'img',
    props: {
      src: sponsor.img,
      width: size,
      height: size,
      style: {
        width: size,
        height: size,
        borderRadius: size / 2,
        marginRight: 8,
        marginBottom: 8,
      },
    },
  }
}

function tierSection(
  spec: TierSpec,
  list: WashedSponsor[],
  t: ThemeTokens,
): Node {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'column', marginTop: 20 },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: t.muted,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: 1,
              marginBottom: 10,
            },
            children: spec.label,
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexWrap: 'wrap' },
            children: list.map((s) => avatar(s, spec.size)),
          },
        },
      ],
    },
  }
}

function header(t: ThemeTokens): Node {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        borderBottom: `1px solid ${t.border}`,
        paddingBottom: 16,
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: t.fg,
              fontSize: 30,
              fontWeight: 700,
            },
            children: 'NAPI-RS Sponsors',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: t.accent,
              fontSize: 15,
              fontWeight: 500,
              marginTop: 4,
            },
            children: 'napi.rs',
          },
        },
      ],
    },
  }
}

export function renderSvg(
  sponsors: WashedSponsors,
  theme: Theme,
  fonts: SatoriFont[],
): Promise<string> {
  const t = THEMES[theme]
  const sections = TIER_SPECS.map((spec) => ({
    spec,
    list:
      spec.key === 'backers'
        ? sponsors[spec.key].slice(0, MAX_BACKERS)
        : sponsors[spec.key],
  }))
    .filter(({ list }) => list.length > 0)
    .map(({ spec, list }) => tierSection(spec, list, t))

  const root: Node = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: t.bg,
        padding: 40,
        fontFamily: 'Manrope',
      },
      children: [header(t), ...sections],
    },
  }

  // satori accepts plain {type,props} nodes as ReactNode; cast keeps TS happy.
  return satori(root as unknown as Parameters<typeof satori>[0], {
    width: CARD_WIDTH,
    fonts,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack yarn vp test run lib/sponsors-image/card.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/sponsors-image/card.ts lib/sponsors-image/card.test.ts
git commit -m "feat(sponsors-image): satori sponsor-wall card renderer"
```

---

### Task 5: SVG → PNG rasterizer (resvg-wasm) + dependency

**Files:**

- Modify: `package.json` (add `@resvg/resvg-wasm@2.6.2`)
- Create: `lib/sponsors-image/resvg.ts`
- Test: `lib/sponsors-image/resvg.test.ts`

**Interfaces:**

- Produces: `function ensureResvg(wasm: WebAssembly.Module): Promise<void>` (guarded `initWasm`, tolerant of "Already initialized"); `function svgToPng(svg: string, width: number): Uint8Array` (assumes `ensureResvg` resolved).

- [ ] **Step 1: Add the dependency**

```bash
corepack yarn add @resvg/resvg-wasm@2.6.2
node -e "console.log(require('./package.json').dependencies['@resvg/resvg-wasm'])"
```

Expected: prints `2.6.2` (or `^2.6.2`). `node_modules/@resvg/resvg-wasm/index_bg.wasm` exists.

- [ ] **Step 2: Write the failing test**

```ts
// @vitest-environment node
// lib/sponsors-image/resvg.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { ensureResvg, svgToPng } from './resvg.ts'

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

beforeAll(async () => {
  await ensureResvg(
    new WebAssembly.Module(
      readFileSync('node_modules/@resvg/resvg-wasm/index_bg.wasm'),
    ),
  )
})

describe('svgToPng', () => {
  it('rasterizes an svg to png bytes', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>'
    const png = svgToPng(svg, 20)
    expect([...png.slice(0, 8)]).toEqual(PNG_MAGIC)
    expect(png.length).toBeGreaterThan(50)
  })

  it('ensureResvg is idempotent (second call resolves)', async () => {
    await expect(
      ensureResvg(
        new WebAssembly.Module(
          readFileSync('node_modules/@resvg/resvg-wasm/index_bg.wasm'),
        ),
      ),
    ).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `corepack yarn vp test run lib/sponsors-image/resvg.test.ts`
Expected: FAIL — cannot resolve `./resvg.ts`.

- [ ] **Step 4: Write minimal implementation**

```ts
// lib/sponsors-image/resvg.ts
// Rasterize an SVG string to PNG bytes with @resvg/resvg-wasm. Runs on the
// Cloudflare edge: the route passes the statically-imported wasm module (a real
// WebAssembly.Module) into ensureResvg once. The SVG paints its own background,
// so no resvg background option is needed; text is already vectorized by satori,
// so no fonts are needed here.

import { initWasm, Resvg } from '@resvg/resvg-wasm'

let resvgReady: Promise<void> | null = null

export function ensureResvg(wasm: WebAssembly.Module): Promise<void> {
  if (!resvgReady) {
    resvgReady = initWasm(wasm).catch((err) => {
      // initWasm throws if already initialized in this isolate — treat as ready.
      if (String(err).includes('Already initialized')) return
      resvgReady = null
      throw err
    })
  }
  return resvgReady
}

export function svgToPng(svg: string, width: number): Uint8Array {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
  return resvg.render().asPng()
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `corepack yarn vp test run lib/sponsors-image/resvg.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json yarn.lock lib/sponsors-image/resvg.ts lib/sponsors-image/resvg.test.ts
git commit -m "feat(sponsors-image): resvg-wasm svg->png + add @resvg/resvg-wasm dep"
```

---

### Task 6: Render orchestrator

**Files:**

- Create: `lib/sponsors-image/render.ts`
- Test: `lib/sponsors-image/render.test.ts`

**Interfaces:**

- Consumes: `inlineSponsorAvatars`/`ImageFetcher` (`./avatars.ts`), `renderSvg`/`CARD_WIDTH` (`./card.ts`), `svgToPng` (`./resvg.ts`), `Theme` (`./theme.ts`), `SatoriFont` (`./fonts.ts`), `WashedSponsors` (`../landing/sponsors.ts`).
- Produces: `interface RenderOptions { format: 'svg' | 'png'; theme: Theme; sponsors: WashedSponsors; fonts: SatoriFont[]; fetchImage?: ImageFetcher }`; `interface RenderResult { body: string | Uint8Array; contentType: string }`; `function renderSponsorsImage(opts: RenderOptions): Promise<RenderResult>`. Assumes `ensureYoga` (and `ensureResvg` for PNG) already resolved by the caller.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
// lib/sponsors-image/render.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderSponsorsImage } from './render.ts'
import { ensureYoga } from './card.ts'
import { ensureResvg } from './resvg.ts'
import type { SatoriFont } from './fonts.ts'
import type { ImageFetcher } from './avatars.ts'
import type { WashedSponsors } from '../landing/sponsors.ts'

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
// a real 1x1 png so resvg can decode the embedded <image>
const onePngBytes = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
)
const fetchImage: ImageFetcher = async () =>
  new Response(onePngBytes, {
    status: 200,
    headers: { 'content-type': 'image/png' },
  })

function fonts(): SatoriFont[] {
  const bold = readFileSync('public/fonts/Manrope_700Bold.ttf')
  const medium = readFileSync('public/fonts/Manrope_500Medium.ttf')
  const toAB = (b: Buffer) =>
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
  return [
    { name: 'Manrope', data: toAB(bold), weight: 700, style: 'normal' },
    { name: 'Manrope', data: toAB(medium), weight: 500, style: 'normal' },
  ]
}
const sponsors: WashedSponsors = {
  specialThanks: [],
  platinum: [
    { name: 'A', img: 'https://x/a.png', url: 'https://github.com/a' },
  ],
  gold: [],
  sliver: [],
  backers: [],
}

beforeAll(async () => {
  await ensureYoga(
    new WebAssembly.Module(readFileSync('node_modules/satori/yoga.wasm')),
  )
  await ensureResvg(
    new WebAssembly.Module(
      readFileSync('node_modules/@resvg/resvg-wasm/index_bg.wasm'),
    ),
  )
})

describe('renderSponsorsImage', () => {
  it('returns an svg body + content-type for format=svg', async () => {
    const out = await renderSponsorsImage({
      format: 'svg',
      theme: 'light',
      sponsors,
      fonts: fonts(),
      fetchImage,
    })
    expect(typeof out.body).toBe('string')
    expect((out.body as string).startsWith('<svg')).toBe(true)
    expect(out.contentType).toBe('image/svg+xml; charset=utf-8')
  })

  it('returns png bytes + content-type for format=png', async () => {
    const out = await renderSponsorsImage({
      format: 'png',
      theme: 'dark',
      sponsors,
      fonts: fonts(),
      fetchImage,
    })
    expect(out.body).toBeInstanceOf(Uint8Array)
    expect([...(out.body as Uint8Array).slice(0, 8)]).toEqual(PNG_MAGIC)
    expect(out.contentType).toBe('image/png')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn vp test run lib/sponsors-image/render.test.ts`
Expected: FAIL — cannot resolve `./render.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/sponsors-image/render.ts
// Orchestrates one sponsors-image response: inline avatars -> satori SVG -> (for
// PNG) resvg rasterize at 2x. Pure of any Hono/worker context so it is unit
// testable; the caller (route) supplies sponsors + fonts and has already run
// ensureYoga (and ensureResvg for PNG).

import type { WashedSponsors } from '../landing/sponsors.ts'
import type { SatoriFont } from './fonts.ts'
import type { Theme } from './theme.ts'
import { inlineSponsorAvatars, type ImageFetcher } from './avatars.ts'
import { renderSvg, CARD_WIDTH } from './card.ts'
import { svgToPng } from './resvg.ts'

const PNG_SCALE = 2

export interface RenderOptions {
  format: 'svg' | 'png'
  theme: Theme
  sponsors: WashedSponsors
  fonts: SatoriFont[]
  fetchImage?: ImageFetcher
}

export interface RenderResult {
  body: string | Uint8Array
  contentType: string
}

export async function renderSponsorsImage(
  opts: RenderOptions,
): Promise<RenderResult> {
  const inlined = await inlineSponsorAvatars(opts.sponsors, opts.fetchImage)
  const svg = await renderSvg(inlined, opts.theme, opts.fonts)
  if (opts.format === 'svg') {
    return { body: svg, contentType: 'image/svg+xml; charset=utf-8' }
  }
  return {
    body: svgToPng(svg, CARD_WIDTH * PNG_SCALE),
    contentType: 'image/png',
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack yarn vp test run lib/sponsors-image/render.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/sponsors-image/render.ts lib/sponsors-image/render.test.ts
git commit -m "feat(sponsors-image): render orchestrator (svg/png)"
```

---

### Task 7: Route handlers + wasm typing + end-to-end smoke test

**Files:**

- Create: `lib/sponsors-image/wasm.d.ts`
- Create: `routes/sponsors.svg.ts`
- Create: `routes/sponsors.png.ts`

**Interfaces:**

- Consumes: everything above, plus `loadSponsors` (`lib/landing/load-sponsors.ts`), `parseTheme` (`./theme.ts`), `defineHandler` (`void`).
- Produces: `GET /sponsors.svg` and `GET /sponsors.png` HTTP endpoints. No importable JS interface.

This task's deliverable is verified by a build + workerd preview smoke test (route handlers can't be meaningfully unit-tested without the Void runtime; the render pipeline is already covered by Tasks 1–6, and the wasm-import→WebAssembly.Module mechanism is already proven).

- [ ] **Step 1: Add the ambient wasm module declaration**

```ts
// lib/sponsors-image/wasm.d.ts
// Void's Cloudflare build turns a static `import x from '….wasm'` into a real
// WebAssembly.Module at the edge. This ambient type lets the route files import
// satori/yoga.wasm and @resvg/resvg-wasm/index_bg.wasm without a TS error.
declare module '*.wasm' {
  const module: WebAssembly.Module
  export default module
}
```

- [ ] **Step 2: Write the SVG route**

```ts
// routes/sponsors.svg.ts
// GET /sponsors.svg — the sponsor wall as a self-contained SVG (avatars inlined,
// Camo-safe) for GitHub READMEs. ?theme=light|dark (default light).
import { defineHandler } from 'void'
import yogaWasm from 'satori/yoga.wasm'
import { loadSponsors } from '../lib/landing/load-sponsors.ts'
import { parseTheme } from '../lib/sponsors-image/theme.ts'
import {
  loadFonts,
  readAsset,
  type AssetsFetcher,
} from '../lib/sponsors-image/fonts.ts'
import { ensureYoga } from '../lib/sponsors-image/card.ts'
import { renderSponsorsImage } from '../lib/sponsors-image/render.ts'

const CACHE_CONTROL =
  'public, s-maxage=1800, max-age=600, stale-while-revalidate=86400'

export const GET = defineHandler(async (c) => {
  await ensureYoga(yogaWasm)
  const theme = parseTheme(c.req.query('theme'))
  const assets = c.env.ASSETS as unknown as AssetsFetcher
  const sponsors = await loadSponsors()
  const fonts = await loadFonts((path) => readAsset(assets, c.req.url, path))
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

- [ ] **Step 3: Write the PNG route**

```ts
// routes/sponsors.png.ts
// GET /sponsors.png — the sponsor wall as a PNG (works everywhere: GitHub, npm,
// crates.io). Same pipeline as the SVG route, then resvg rasterizes at 2x.
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

const CACHE_CONTROL =
  'public, s-maxage=1800, max-age=600, stale-while-revalidate=86400'

export const GET = defineHandler(async (c) => {
  await ensureYoga(yogaWasm)
  await ensureResvg(resvgWasm)
  const theme = parseTheme(c.req.query('theme'))
  const assets = c.env.ASSETS as unknown as AssetsFetcher
  const sponsors = await loadSponsors()
  const fonts = await loadFonts((path) => readAsset(assets, c.req.url, path))
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

- [ ] **Step 4: Regenerate route types and build**

Run:

```bash
corepack yarn void prepare
corepack yarn build
```

Expected: `void prepare` lists `/sponsors.svg` and `/sponsors.png` in `.void/routes.d.ts`; build completes ("built in …") with no errors. (`GITHUB_TOKEN` from `.env.local` is required for the build's changelog/sponsors fetch — it is already present in the worktree.)

- [ ] **Step 5: Smoke-test both routes in the workerd runtime**

Run:

```bash
(corepack yarn preview > /tmp/sponsors-preview.log 2>&1 &) ; sleep 6
echo "--- PNG ---"; curl -s -D - -o /tmp/sponsors.png -m 30 "http://localhost:4173/sponsors.png"    | grep -iE 'HTTP/|content-type|cache-control'
echo "--- SVG dark ---"; curl -s -D - -o /tmp/sponsors.svg -m 30 "http://localhost:4173/sponsors.svg?theme=dark" | grep -iE 'HTTP/|content-type|cache-control'
echo "--- PNG magic ---"; xxd -l 8 /tmp/sponsors.png
echo "--- SVG head ---"; head -c 60 /tmp/sponsors.svg; echo
echo "--- sizes ---"; ls -la /tmp/sponsors.png /tmp/sponsors.svg
pkill -f "vite preview" 2>/dev/null; pkill -f preview 2>/dev/null
```

Expected:

- `/sponsors.png` → `200`, `content-type: image/png`, `cache-control: public, s-maxage=1800, max-age=600, stale-while-revalidate=86400`; `xxd` shows `8950 4e47 0d0a 1a0a`; file > 2 KB.
- `/sponsors.svg?theme=dark` → `200`, `content-type: image/svg+xml; charset=utf-8`; head starts with `<svg`; file > 1 KB.

If a route 500s, read `/tmp/sponsors-preview.log` for the stack (common causes: a `.wasm` import not resolving → check the import path; fonts 404 → confirm `public/fonts/*.ttf` were built into `dist/client/fonts/`).

- [ ] **Step 6: Commit**

```bash
git add lib/sponsors-image/wasm.d.ts routes/sponsors.svg.ts routes/sponsors.png.ts
git commit -m "feat(sponsors-image): /sponsors.svg + /sponsors.png route handlers"
```

---

## Self-Review

**Spec coverage:**

- PNG + SVG endpoints → Task 7 (routes), Task 6 (format branch). ✅
- `?theme=light|dark` default light → Task 1 (`parseTheme`), threaded through Tasks 6–7. ✅
- Avatars-only wall, tiers largest→smallest, `sliver`→`SILVER` label → Task 4 (`TIER_SPECS`). ✅
- Runtime/always-fresh via `loadSponsors()` → Tasks 7. ✅
- Edge PNG via `@resvg/resvg-wasm`, satori via `satori/standalone`, wasm as static import → Tasks 5, 4, 7. ✅
- Avatars base64-inlined, WebP-safe → Task 2. ✅
- Fonts vendored + loaded via ASSETS → Task 3. ✅
- `Cache-Control` exact string → Task 7 constant (matches Global Constraints). ✅

**Placeholder scan:** none — every code step is complete.

**Type consistency:** `WashedSponsors`/`WashedSponsor` (from existing `lib/landing/sponsors.ts`), `SatoriFont`, `Theme`/`ThemeTokens`, `ImageFetcher`, `AssetReader`/`AssetsFetcher`, `RenderOptions`/`RenderResult`, `CARD_WIDTH`, `ensureYoga`/`ensureResvg`/`renderSvg`/`svgToPng`/`renderSponsorsImage` are defined once and consumed with the same signatures across tasks. ✅

## Notes for the executor / out of scope

- **README embed snippets** (for the napi-rs GitHub repo, the `napi` crate, and the `@napi-rs/*` npm packages) are authored in those external repos, not here. After deploy, the user embeds e.g.
  `[![Sponsors](https://napi.rs/sponsors.png)](https://napi.rs/#sponsor)` for npm/crates, and on GitHub a `<picture>` with `https://napi.rs/sponsors.svg?theme=dark` / `…?theme=light` for auto theme switching.
- **Not in v1 (YAGNI):** per-sponsor clickable regions (stripped by Camo), rendered sponsor names, per-tier sub-endpoints, an in-isolate render memo (edge `s-maxage` + the existing 10-min `loadSponsors` cache suffice).
- **Do not commit** `dist/`, `.env.local`, `.void/` (gitignored). The `.env.local` (real `GITHUB_TOKEN`) already present in the worktree is needed only for local `build`/`preview`.
