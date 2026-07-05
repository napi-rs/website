// Pure, edge-safe OG image URL helper. NO fs / node imports — imported by
// lib/seo/head.ts, which runs on Cloudflare Workers.
import { BASE_URL, neutralPath } from './urls.ts'

const FALLBACK = `${BASE_URL}/img/og-v2.png`

/** Per-page generated OG image URL for docs/blog, else the static fallback. */
export function ogImageUrl(publicPath: string): string {
  const neutral = neutralPath(publicPath)
  if (!(neutral.startsWith('/docs/') || neutral.startsWith('/blog/'))) {
    return FALLBACK
  }
  const served = publicPath.replace(/\/+$/, '').replace(/^\//, '')
  return `${BASE_URL}/og/${served}.png`
}
