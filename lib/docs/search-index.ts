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
import { localizeHref } from './locale.ts'
import type { MdPageLike } from './page-data.ts'

export interface SearchEntry {
  /** Locale-prefixed route path from @void/md/pages, e.g. /en/docs/concepts/enum. */
  path: string
  /**
   * PUBLIC, navigable href: the md `path` with its locale segment normalised to
   * the user-facing route (en dropped to root: `/docs/…`; cn/pt-BR kept:
   * `/cn/docs/…`). Navigating here keeps the canonical URL and round-trips
   * cleanly through splitLocale (unlike the raw `/en/…` md path).
   */
  href: string
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
 * Strip the leading locale segment from a `@void/md/pages` path, yielding the
 * UNPREFIXED leaf (`/en/docs/concepts/enum` -> `docs/concepts/enum`,
 * `/cn/docs/x` -> `docs/x`).
 */
export function pageLeaf(path: string): string {
  const stripped = path.replace(/^\/+/, '')
  const slash = stripped.indexOf('/')
  return slash === -1 ? '' : stripped.slice(slash + 1)
}

/**
 * The PUBLIC navigable href for a `@void/md/pages` path: drop the leading locale
 * segment, then re-apply the en-at-root / cn-prefixed route asymmetry via
 * `localizeHref` (en -> `/docs/…`, cn -> `/cn/docs/…`).
 */
export function pageHref(path: string): string {
  return localizeHref(pageLeaf(path), pageLocale(path))
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
      href: pageHref(page.path),
      title: page.title,
      headings: page.headings.map((h) => h.text),
      description,
    })
  }

  return index
}

export { LOCALES }
