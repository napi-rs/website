// routes/support-matrix.png.ts
// GET /support-matrix.png — the napi-rs support-matrix badge as a PNG (works
// everywhere an SVG might be blocked: some npm/crates surfaces, chat unfurls).
// Same query contract as support-matrix.svg (see lib/support-matrix/query.ts);
// ?theme=light|dark (default light).
//
// Like the svg route the image is a pure function of the query — no warm cache,
// no cron, no background refresh: parse → resolve → render → respond. Both
// `*.wasm` imports MUST stay in this route file (Void turns them into
// WebAssembly.Modules at the edge); renderMatrix initializes yoga AND resvg
// internally, so we never call ensureYoga/ensureResvg here.
import { defineHandler } from 'void'
import yogaWasm from 'satori/yoga.wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import {
  loadFonts,
  readAsset,
  type AssetsFetcher,
} from '../lib/sponsors-image/fonts.ts'
import { resolveMatrix } from '../lib/support-matrix/resolve.ts'
import { renderMatrix } from '../lib/support-matrix/render.ts'
import { parseSupportMatrixQuery } from '../lib/support-matrix/query.ts'

// One day at the edge + a week of stale-while-revalidate. Safe to cache hard:
// the image only changes when the query (the cache key) changes.
const CACHE_CONTROL =
  'public, s-maxage=86400, max-age=86400, stale-while-revalidate=604800'

export const GET = defineHandler(async (c) => {
  const { query, theme } = parseSupportMatrixQuery((key) => c.req.query(key))
  const model = resolveMatrix(query)
  const fonts = await loadFonts((path) =>
    readAsset(
      (c.env as unknown as { ASSETS: AssetsFetcher }).ASSETS,
      c.req.url,
      path,
    ),
  )
  const { body, contentType } = await renderMatrix({
    format: 'png',
    theme,
    model,
    fonts,
    yogaWasm,
    resvgWasm,
  })
  return new Response(body as BodyInit, {
    headers: { 'Content-Type': contentType, 'Cache-Control': CACHE_CONTROL },
  })
})
