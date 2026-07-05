// Pure orchestrator: the full <head> injection block for a page. Edge-safe.
import { selfCanonical, neutralPath, localeUrl } from './urls.ts'
import { hreflangLinks } from './hreflang.ts'
import { jsonLdFor } from './jsonld.ts'
import { ogImageUrl } from './og-image.ts'

export interface SeoHeadArgs {
  publicPath: string
  title: string
  description: string
  hasDescriptionMeta: boolean
  isFallback: boolean
  mdLink: string
}

export function buildSeoHead({
  publicPath,
  title,
  description,
  hasDescriptionMeta,
  isFallback,
  mdLink,
}: SeoHeadArgs): string {
  const canonical = isFallback
    ? localeUrl(neutralPath(publicPath), 'en')
    : selfCanonical(publicPath)
  // Per-page OG PNGs are generated only for routes with a real .md on disk. An
  // i18n-fallback page keeps its cn/pt-BR URL but has no localized .md (and thus
  // no localized PNG), so point og:image at the en image — mirror the canonical.
  const imageUrl = ogImageUrl(isFallback ? neutralPath(publicPath) : publicPath)
  const descMeta = hasDescriptionMeta
    ? ''
    : `<meta name="description" content="${description}">`
  return (
    descMeta +
    `<link rel="canonical" href="${canonical}">` +
    hreflangLinks(publicPath) +
    jsonLdFor(publicPath, { title, description }) +
    mdLink +
    `<meta property="og:title" content="${title}">` +
    `<meta property="og:description" content="${description}">` +
    `<meta property="og:url" content="${canonical}">` +
    `<meta property="og:image" content="${imageUrl}">` +
    `<meta name="twitter:image" content="${imageUrl}">` +
    `<meta name="twitter:title" content="${title}">` +
    `<meta name="twitter:description" content="${description}">`
  )
}
