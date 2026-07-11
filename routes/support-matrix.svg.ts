// routes/support-matrix.svg.ts
// GET /support-matrix.svg — the napi-rs cross-platform support-matrix badge as a
// self-contained SVG (Manrope vectorized to <path>, so it embeds in any README on
// GitHub / npm / crates). ?theme=light|dark (default light); the target tiers,
// engines range, name, etc. come from the query — see lib/support-matrix/query.ts.
//
// Unlike sponsors.svg there is NO warm cache: the image is a pure function of the
// query string, so the whole handler is parse → resolve → render → respond, and
// it caches hard on the full URL. The `*.wasm` import MUST stay in this route file
// (Void turns it into a WebAssembly.Module at the edge); yoga is initialized
// inside renderMatrix/renderSvg, so we never touch ensureYoga here.
import { defineHandler } from 'void'
import yogaWasm from 'satori/yoga.wasm'
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
    format: 'svg',
    theme,
    model,
    fonts,
    yogaWasm,
  })
  return new Response(body as BodyInit, {
    headers: { 'Content-Type': contentType, 'Cache-Control': CACHE_CONTROL },
  })
})
