// routes/sponsors.svg.ts
// GET /sponsors.svg — the sponsor wall as a self-contained SVG (avatars inlined,
// Camo-safe) for GitHub READMEs. ?theme=light|dark (default light). Serves the
// cron/webhook-warmed blob from R2 via the KV manifest; on a cold cache miss it
// renders this one live AND kicks off a background refresh (force) that warms
// all 4 blobs (svg/png x light/dark) for next time.
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

  // Warm path: serve the cron/webhook-rendered blob straight from R2.
  if (e.KV && e.STORAGE) {
    const cached = await readImage(e.KV, e.STORAGE, 'svg', theme)
    if (cached) {
      return new Response(cached.body as BodyInit, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': CACHE_CONTROL,
        },
      })
    }
  }

  // Cold miss: render THIS request live, then warm all 4 blobs in the background.
  await ensureYoga(yogaWasm)
  const sponsors = await loadSponsors()
  const fonts = await loadFonts((path) => readAsset(e.ASSETS, c.req.url, path))
  const { body, contentType } = await renderSponsorsImage({
    format: 'svg',
    theme,
    sponsors,
    fonts,
  })
  if (e.KV && e.STORAGE) {
    const kv = e.KV
    const r2 = e.STORAGE
    c.executionCtx.waitUntil(
      refreshSponsorsCache({
        kv,
        r2,
        // Reuse the good data we just rendered from — a second bypassed fetch
        // could degrade to empty and (on a cold cache, no manifest) publish an
        // empty first snapshot over a request that already had live data.
        loadFresh: () => Promise.resolve(sponsors),
        loadFonts: () => loadFonts((p) => readAsset(e.ASSETS, c.req.url, p)),
        yogaWasm,
        resvgWasm,
        force: true,
      }),
    )
  }
  return new Response(body as BodyInit, {
    headers: { 'Content-Type': contentType, 'Cache-Control': CACHE_CONTROL },
  })
})
