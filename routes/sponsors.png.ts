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
