// Builds a lightweight, per-locale search index from `@void/md/pages`.
//
// Full body-text indexing is intentionally DEFERRED (the @void/md page metadata
// does not expose rendered body text). For now each entry carries the title,
// the heading texts, and the frontmatter `description` — enough for a fast
// Cmd-K title/heading search in the Navbar search island.
//
// Kept pure: `buildSearchIndexCore` takes the pages array as a parameter so it
// is testable without the virtual module. The Search island calls the thin
// `buildSearchIndex()` wrapper with the live `@void/md/pages` import.

import type { Locale } from '../nav/index.ts'
import type { MdPageLike } from './page-data.ts'

export interface SearchEntry {
  /** Locale-prefixed route path from @void/md/pages, e.g. /en/docs/concepts/enum. */
  path: string
  title: string
  /** Heading texts (for matching + result sub-rows). */
  headings: string[]
  /** frontmatter.description, when present. */
  description?: string
}

export type SearchIndex = Record<Locale, SearchEntry[]>

const LOCALES: Locale[] = ['en', 'cn', 'pt-BR']

/** The locale segment of a `@void/md/pages` path (`/cn/docs/…` -> `cn`). */
export function pageLocale(path: string): Locale {
  const seg = path.split('/')[1]
  return seg === 'cn' || seg === 'pt-BR' ? seg : 'en'
}

/**
 * Group md pages into a per-locale search index. Non-`.md` and locale-less
 * paths default to the `en` bucket via `pageLocale`.
 */
export function buildSearchIndexCore(
  pages: ReadonlyArray<MdPageLike>,
): SearchIndex {
  const index = {
    en: [],
    cn: [],
    'pt-BR': [],
  } as SearchIndex

  for (const page of pages) {
    const locale = pageLocale(page.path)
    const description =
      typeof page.frontmatter.description === 'string'
        ? page.frontmatter.description
        : undefined
    index[locale].push({
      path: page.path,
      title: page.title,
      headings: page.headings.map((h) => h.text),
      description,
    })
  }

  return index
}

export { LOCALES }
