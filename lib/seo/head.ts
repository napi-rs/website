// Pure orchestrator: the full <head> injection block for a page. Edge-safe.
import { selfCanonical, neutralPath, localeUrl } from './urls.ts'
import { hreflangLinks } from './hreflang.ts'
import { jsonLdFor } from './jsonld.ts'

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
    `<meta property="og:url" content="${canonical}">`
  )
}
