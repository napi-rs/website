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
  return new Response(body as BodyInit, {
    headers: { 'Content-Type': contentType, 'Cache-Control': CACHE_CONTROL },
  })
})
