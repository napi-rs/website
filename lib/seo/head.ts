// Pure orchestrator: the full <head> injection block for a page. Edge-safe.
import { selfCanonical, neutralPath } from './urls.ts'
import { hreflangLinks } from './hreflang.ts'
import { jsonLdFor } from './jsonld.ts'
import { ogImageUrl } from './og-image.ts'
import { escapeAttr } from './escape.ts'

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
  // An i18n-fallback page keeps its cn/pt-BR public URL but serves the en/neutral
  // content: it has no localized .md (so no localized OG PNG) and its JSON-LD
  // describes the en page. Compute the effective (served) path ONCE so canonical,
  // og:image AND JSON-LD all agree — previously canonical said en while the
  // JSON-LD url/inLanguage still said cn/zh-CN.
  const effectivePath = isFallback ? neutralPath(publicPath) : publicPath
  const canonical = selfCanonical(effectivePath)
  const imageUrl = ogImageUrl(effectivePath)
  // title/description are page-authored and flow straight into `content="…"`
  // attributes — escape them so a `"` or `<` cannot break out of the attribute.
  const t = escapeAttr(title)
  const d = escapeAttr(description)
  const descMeta = hasDescriptionMeta
    ? ''
    : `<meta name="description" content="${d}">`
  return (
    descMeta +
    `<link rel="canonical" href="${canonical}">` +
    hreflangLinks(publicPath) +
    jsonLdFor(effectivePath, { title, description }) +
    mdLink +
    `<meta property="og:title" content="${t}">` +
    `<meta property="og:description" content="${d}">` +
    `<meta property="og:url" content="${canonical}">` +
    `<meta property="og:image" content="${imageUrl}">` +
    `<meta name="twitter:image" content="${imageUrl}">` +
    `<meta name="twitter:title" content="${t}">` +
    `<meta name="twitter:description" content="${d}">`
  )
}
