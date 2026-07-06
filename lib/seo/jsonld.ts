// Pure, edge-safe JSON-LD builder. Chooses schema by route shape.
import { selfCanonical, neutralPath, BASE_URL } from './urls.ts'
import { getLocale, htmlLang } from '../docs/locale.ts'
import { nav, type Locale } from '../nav/index.ts'
import { getBreadcrumbCore } from '../docs/page-data.ts'
import { routeMap, blogDates } from '../i18n/route-map.gen.ts'

const ORGANIZATION = {
  '@type': 'Organization',
  name: 'NAPI-RS',
  url: BASE_URL,
  logo: `${BASE_URL}/img/favicon.png`,
  sameAs: [
    'https://github.com/napi-rs/napi-rs',
    'https://twitter.com/napi_rs',
    'https://discord.gg/SpWzYHsKHs',
  ],
}

// `getBreadcrumbCore` expects the page-existence set keyed BY LOCALE
// (it does `existsByPage[locale]?.has(leaf)` internally, via
// firstSectionLeafHref/isLeafReachable). `routeMap` keys are neutral paths WITH
// a leading slash (e.g. `/docs/concepts/class`) mapped to the locales that serve
// them; strip the slash to get the unprefixed, section-qualified leaf the
// breadcrumb helpers compare against, and bucket per locale.
const EXISTS_BY_PAGE: Record<Locale, ReadonlySet<string>> = (() => {
  const sets: Record<Locale, Set<string>> = {
    en: new Set(),
    cn: new Set(),
    'pt-BR': new Set(),
  }
  for (const [path, locales] of Object.entries(routeMap)) {
    const leaf = path.replace(/^\//, '')
    for (const locale of locales) sets[locale].add(leaf)
  }
  return sets
})()

function breadcrumbList(publicPath: string) {
  const locale = getLocale(publicPath)
  const leaf = neutralPath(publicPath).replace(/^\//, '')
  const crumbs = getBreadcrumbCore(leaf, locale, nav[locale], EXISTS_BY_PAGE)
  if (!crumbs.length) return null
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.href
        ? { item: c.href.startsWith('http') ? c.href : `${BASE_URL}${c.href}` }
        : {}),
    })),
  }
}

export function jsonLdFor(
  publicPath: string,
  { title, description }: { title: string; description: string },
): string {
  const url = selfCanonical(publicPath)
  const inLanguage = htmlLang(getLocale(publicPath))
  const neutral = neutralPath(publicPath)
  const graph: unknown[] = []

  if (neutral === '/') {
    graph.push(
      { '@type': 'WebSite', name: 'NAPI-RS', url, inLanguage, description },
      ORGANIZATION,
    )
  } else if (neutral.startsWith('/docs/')) {
    graph.push({
      '@type': 'TechArticle',
      headline: title,
      description,
      inLanguage,
      url,
      publisher: ORGANIZATION,
    })
    const bc = breadcrumbList(publicPath)
    if (bc) graph.push(bc)
  } else if (neutral.startsWith('/blog/')) {
    const date = blogDates[neutral]
    graph.push({
      '@type': 'BlogPosting',
      headline: title,
      description,
      inLanguage,
      url,
      author: { '@type': 'Organization', name: 'NAPI-RS' },
      publisher: ORGANIZATION,
      ...(date ? { datePublished: date } : {}),
    })
  } else {
    return '' // changelog + anything else: no JSON-LD
  }

  const ld = { '@context': 'https://schema.org', '@graph': graph }
  // Escape `<` so a title/description containing `</script>` cannot close the
  // inline JSON-LD block early (the classic script-context XSS). `<` is a
  // valid JSON escape for `<`, so the payload still parses byte-for-byte.
  return `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`
}
