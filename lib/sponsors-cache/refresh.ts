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

// A healthy fetch always includes the Special Thanks entry, so an all-empty
// washed list means loadSponsors degraded (no token / non-200 / GraphQL error
// / timeout — it returns empty, never throws). Used to refuse publishing a
// degraded snapshot (see the guard in refreshSponsorsCache).
function isEmpty(data: WashedSponsors): boolean {
  return (
    data.specialThanks.length === 0 &&
    data.platinum.length === 0 &&
    data.gold.length === 0 &&
    data.sliver.length === 0 &&
    data.backers.length === 0
  )
}

export async function refreshSponsorsCache(
  deps: RefreshDeps,
): Promise<RefreshResult> {
  const data = await deps.loadFresh()
  const version = await hashSponsors(data)
  const current = await readManifest(deps.kv)

  // Degraded-fetch guard: NEVER publish an all-empty (degraded) snapshot — not
  // even on a cold cache. Rationale: (1) don't cache an outage — an empty wall
  // written to R2 is sticky for s-maxage, whereas skipping keeps the cache cold
  // so cold-misses live-render and self-heal the moment GitHub recovers; and
  // (2) the manifest is read once here, BEFORE the slow render, so a "cold + no
  // manifest" empty writer that later reached writeSnapshot could clobber a
  // snapshot a concurrent good refresh published in the meantime. Skipping the
  // write entirely closes that race. (A healthy fetch always includes the
  // Special Thanks entry, so all-empty reliably means degraded.)
  if (isEmpty(data)) {
    return {
      version: current?.version ?? version,
      changed: false,
      imageCount: 0,
    }
  }

  // Unchanged content: skip re-render unless forced.
  if (!deps.force && current?.version === version) {
    return { version, changed: false, imageCount: 0 }
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

  await writeSnapshot(
    deps.kv,
    deps.r2,
    data,
    version,
    images,
    current?.version ?? null,
  )
  return { version, changed: true, imageCount: images.length }
}
