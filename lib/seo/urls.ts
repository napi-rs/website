// Pure, edge-safe SEO URL helpers. NO fs / node imports — imported by
// middleware/01.head.ts, which runs on Cloudflare Workers.
import { splitLocale, getLocale, DEFAULT_LOCALE } from '../docs/locale.ts'
import type { Locale } from '../nav/index.ts'

export const BASE_URL = 'https://napi.rs'

/**
 * Locale-neutral route key for a public path: locale prefix removed, leading
 * slash preserved, no trailing slash. Home and any `/en/…` normalise to the
 * unprefixed form. `/cn/docs/x` -> `/docs/x`, `/cn` -> `/`.
 */
export function neutralPath(publicPath: string): string {
  const [, rest] = splitLocale(publicPath)
  // `splitLocale` only strips cn / pt-BR prefixes (en is served unprefixed), so
  // a public path may still carry an explicit `/en/…` prefix — normalise that
  // to the unprefixed form too. Also drop any trailing slash(es) so a route
  // that arrives as `/cn/docs/x/` still matches the (slash-free) route-map key
  // used for canonical + hreflang; `/` and `/cn` collapse to root as before.
  const neutral = (rest === 'en' ? '' : rest.replace(/^en\//, '')).replace(
    /\/+$/,
    '',
  )
  return neutral ? `/${neutral}` : '/'
}

/** Absolute URL of a neutral path in a given locale (en at root, others prefixed). */
export function localeUrl(neutral: string, locale: Locale): string {
  const suffix = neutral === '/' ? '' : neutral
  if (locale === DEFAULT_LOCALE) {
    return suffix ? `${BASE_URL}${suffix}` : `${BASE_URL}/`
  }
  return `${BASE_URL}/${locale}${suffix}`
}

/** The real served (canonical) URL for a public path. */
export function selfCanonical(publicPath: string): string {
  return localeUrl(neutralPath(publicPath), getLocale(publicPath))
}
