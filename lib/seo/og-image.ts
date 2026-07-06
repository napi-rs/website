// Pure, edge-safe OG image URL helper. NO fs / node imports — imported by
// lib/seo/head.ts, which runs on Cloudflare Workers.
import { BASE_URL, neutralPath } from './urls.ts'
import { getLocale, DEFAULT_LOCALE } from '../docs/locale.ts'

const FALLBACK = `${BASE_URL}/img/og-v2.png`

/** Per-page generated OG image URL for docs/blog, else the static fallback. */
export function ogImageUrl(publicPath: string): string {
  const neutral = neutralPath(publicPath)
  if (!(neutral.startsWith('/docs/') || neutral.startsWith('/blog/'))) {
    return FALLBACK
  }
  // Rebuild the served path from (locale + neutral), NOT the raw publicPath: the
  // deploy prerenderer dispatches pages by their INTERNAL `/en/docs/…` route
  // (it bypasses the edge `/en/* -> /:splat` redirect), so a non-fallback en
  // page can arrive here with a raw `en/` prefix. The generator writes en cards
  // UNPREFIXED (`/og/docs/….png`) and cn/pt-BR prefixed (`/og/cn/…`,
  // `/og/pt-BR/…`) — exactly `fileToRoute`'s shape — so mirror that: the default
  // locale drops its prefix, the others keep theirs. Emitting `/og/en/…` would
  // point at a PNG that is never generated (404). canonical/og:url already
  // normalise `en` -> root via selfCanonical, so only og:image needed this.
  const locale = getLocale(publicPath)
  const served =
    locale === DEFAULT_LOCALE ? neutral.slice(1) : `${locale}${neutral}`
  return `${BASE_URL}/og/${served}.png`
}
