// Pure, edge-safe hreflang builder. Reciprocal language alternates + x-default.
import { routeMap } from '../i18n/route-map.gen.ts'
import { localeUrl, neutralPath } from './urls.ts'
import { htmlLang } from '../docs/locale.ts'
import type { Locale } from '../nav/index.ts'

const ORDER: Locale[] = ['en', 'cn', 'pt-BR']

export interface HreflangAlt {
  hreflang: string
  href: string
}

/**
 * Ordered hreflang alternates for every locale that really serves the page,
 * plus `x-default` -> en. Empty when the route has < 2 locales. Single source
 * of truth — reused by hreflangLinks (head) and the sitemap generator.
 */
export function hreflangAlternates(
  publicPath: string,
  map: Record<string, Locale[]> = routeMap,
): HreflangAlt[] {
  const neutral = neutralPath(publicPath)
  const locales = map[neutral]
  if (!locales || locales.length < 2) return []
  const alts: HreflangAlt[] = ORDER.filter((l) => locales.includes(l)).map(
    (l) => ({ hreflang: htmlLang(l), href: localeUrl(neutral, l) }),
  )
  if (locales.includes('en')) {
    alts.push({ hreflang: 'x-default', href: localeUrl(neutral, 'en') })
  }
  return alts
}

/** The alternates rendered as `<link rel="alternate" hreflang>` tags. */
export function hreflangLinks(
  publicPath: string,
  map: Record<string, Locale[]> = routeMap,
): string {
  return hreflangAlternates(publicPath, map)
    .map(
      (a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}">`,
    )
    .join('')
}
