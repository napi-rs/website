// Joins between three data sources, kept pure + unit-testable:
//   1. lib/nav (generated): structure — tabs, sidebar groups, ordered leaves.
//      Leaf `path` is UNPREFIXED and section-qualified, e.g.
//      `docs/concepts/class`. Sidebar is keyed by tab ('docs'|'blog'|'changelog').
//   2. @void/md/pages (virtual): per-page metadata — title, frontmatter,
//      headings — keyed by the LOCALE-PREFIXED route path, e.g.
//      `/en/docs/concepts/class`, `/cn/docs/concepts/class`.
//   3. lib/docs/locale: the en-at-root vs cn/pt-BR-prefixed href asymmetry.
//
// The PURE core functions below take their data sources as parameters so they
// can be unit-tested with hand-built fixtures (never importing the virtual
// module). Thin runtime wrappers (page-data.runtime.ts is intentionally NOT a
// thing — components call these with the live `nav` + `pages` they import) live
// alongside; tests target the *Core functions.

import type { Locale, LocaleNav, NavGroup } from '../nav/index.ts'
import { localizeHref, localeSectionIndex } from './locale.ts'

/** Minimal shape we need from a `@void/md/pages` entry (structural typing). */
export interface MdPageLike {
  path: string
  title: string
  frontmatter: Record<string, unknown>
  headings: ReadonlyArray<{ depth: number; slug: string; text: string }>
}

export interface BreadcrumbItem {
  label: string
  href: string
}

export interface PagerLink {
  title: string
  /** ROUTE href (locale-correct). */
  href: string
}

export interface PagerLinks {
  prev: PagerLink | null
  next: PagerLink | null
}

/**
 * The literal LOCALE-PREFIXED md-page path for an unprefixed nav leaf.
 *
 * Unlike `localizeHref` (which yields the user-facing ROUTE and drops the `en`
 * prefix), `@void/md/pages` entries ALWAYS carry the locale segment — even for
 * en, whose files live at `pages/en/docs/…`. So we always prefix here.
 *
 *   mdPagePath('docs/concepts/class', 'en') === '/en/docs/concepts/class'
 *   mdPagePath('docs/concepts/class', 'cn') === '/cn/docs/concepts/class'
 */
export function mdPagePath(leafPath: string, locale: Locale): string {
  return `/${locale}/${leafPath.replace(/^\/+/, '')}`
}

/** The tab key a leaf belongs to (`docs/concepts/class` -> `docs`). */
export function leafSection(leafPath: string): string {
  return leafPath.replace(/^\/+/, '').split('/')[0]
}

// ---------------------------------------------------------------------------
// getPageData — join a nav leaf to its @void/md metadata
// ---------------------------------------------------------------------------

/**
 * Resolve the `@void/md/pages` entry for an unprefixed nav leaf in a locale.
 *
 * Because non-default locales fall back to the en page when untranslated (see
 * middleware/02.i18n-fallback.ts), the requested locale's md entry may be
 * absent; callers that need the rendered metadata can fall back to en
 * themselves. This function does NOT fall back — it returns exactly the entry
 * for `(leafPath, locale)` or undefined — so the i18n-fallback flag stays the
 * sole owner of fallback semantics.
 */
export function getPageDataCore(
  leafPath: string,
  locale: Locale,
  pages: ReadonlyArray<MdPageLike>,
): MdPageLike | undefined {
  const target = mdPagePath(leafPath, locale)
  return pages.find((p) => p.path === target)
}

// ---------------------------------------------------------------------------
// getBreadcrumb — Home > tab > group > leaf
// ---------------------------------------------------------------------------

function findGroupAndLeaf(
  groups: ReadonlyArray<NavGroup>,
  leafPath: string,
): { group: NavGroup; leafTitle: string } | undefined {
  for (const group of groups) {
    const item = group.items.find((i) => i.path === leafPath)
    if (item) return { group, leafTitle: item.title }
  }
  return undefined
}

/**
 * Build the breadcrumb trail for a leaf: Home > <tab> > <group> > <leaf>.
 *
 * - Home links to the locale root (`/`, `/cn`, `/pt-BR`).
 * - The tab links to the section index (`/docs`, `/cn/docs`).
 * - The group is a non-link label (it has no own page) — represented with an
 *   empty href; the renderer should style it as plain text.
 * - The leaf is the current page (also emitted as a link to itself for
 *   completeness; the renderer may render it as plain text).
 *
 * Returns an empty array if the leaf is not found in the locale's nav.
 */
export function getBreadcrumbCore(
  leafPath: string,
  locale: Locale,
  localeNav: LocaleNav,
): BreadcrumbItem[] {
  const section = leafSection(leafPath)
  const tab = localeNav.tabs.find((t) => t.key === section)
  const groups = localeNav.sidebar[section] ?? []
  const found = findGroupAndLeaf(groups, leafPath)
  if (!tab || !found) return []

  const homeLabel =
    locale === 'en' ? 'Home' : locale === 'cn' ? '首页' : 'Início'

  return [
    { label: homeLabel, href: localizeHref('', locale) },
    { label: tab.title, href: localizeHref(section, locale) },
    { label: found.group.title, href: '' },
    { label: found.leafTitle, href: localizeHref(leafPath, locale) },
  ]
}

// ---------------------------------------------------------------------------
// getPagerLinks — flatten the section sidebar, find prev/next
// ---------------------------------------------------------------------------

/** Flatten every leaf of a section's sidebar groups, in display order. */
export function flattenSection(
  groups: ReadonlyArray<NavGroup>,
): Array<{ title: string; path: string }> {
  const out: Array<{ title: string; path: string }> = []
  for (const group of groups) {
    for (const item of group.items) out.push(item)
  }
  return out
}

/**
 * Prev/next links for a leaf, flattening the WHOLE section sidebar in order.
 * `prev`/`next` are null at the ends, or if the leaf is not in the section.
 */
export function getPagerLinksCore(
  leafPath: string,
  locale: Locale,
  localeNav: LocaleNav,
): PagerLinks {
  const section = leafSection(leafPath)
  const flat = flattenSection(localeNav.sidebar[section] ?? [])
  const idx = flat.findIndex((i) => i.path === leafPath)
  if (idx === -1) return { prev: null, next: null }

  const toLink = (i: { title: string; path: string }): PagerLink => ({
    title: i.title,
    href: localizeHref(i.path, locale),
  })

  return {
    prev: idx > 0 ? toLink(flat[idx - 1]) : null,
    next: idx < flat.length - 1 ? toLink(flat[idx + 1]) : null,
  }
}

// ---------------------------------------------------------------------------
// computeLangSwitchUrl — switch locale, falling back when the page is absent
// ---------------------------------------------------------------------------

/**
 * Build a per-locale Set of UNPREFIXED leaf paths that exist in that locale,
 * derived from `nav`. Used by computeLangSwitchUrl to decide whether the target
 * locale actually has the current page.
 */
export function buildExistenceSets(
  nav: Record<Locale, LocaleNav>,
): Record<Locale, ReadonlySet<string>> {
  const result = {} as Record<Locale, Set<string>>
  for (const locale of Object.keys(nav) as Locale[]) {
    const set = new Set<string>()
    for (const groups of Object.values(nav[locale].sidebar)) {
      for (const group of groups) {
        for (const item of group.items) set.add(item.path)
      }
    }
    result[locale] = set
  }
  return result
}

/**
 * Compute the href to navigate to when the user switches to `targetLocale`
 * from `currentPath`.
 *
 * - If the same page exists in the target locale, link to it there.
 * - Otherwise fall back to the target locale's section index (`/docs`,
 *   `/cn/docs`), or the target locale root if the path has no section.
 *
 * `currentPath` is the live ROUTE path (`useRouter().path`); we derive the
 * source locale + unprefixed remainder from it.
 */
export function computeLangSwitchUrl(
  currentPath: string,
  targetLocale: Locale,
  existence: Record<Locale, ReadonlySet<string>>,
  splitLocaleFn: (p: string) => [Locale, string],
): string {
  const [, rest] = splitLocaleFn(currentPath)
  if (!rest) return localizeHref('', targetLocale)

  if (existence[targetLocale]?.has(rest)) {
    return localizeHref(rest, targetLocale)
  }

  // Fall back to the section index of the target locale, or its root.
  const section = leafSection(rest)
  if (section) return localeSectionIndex(section, targetLocale)
  return localizeHref('', targetLocale)
}

/**
 * Filter a page's headings to the TOC range (h2–h3 by default). Pure helper so
 * `useCurrentPageHeadings()` (a thin runtime wrapper that reads
 * `getPageDataCore(...).headings`) and tests share one implementation.
 */
export function tocHeadings(
  headings: ReadonlyArray<{ depth: number; slug: string; text: string }>,
  minDepth = 2,
  maxDepth = 3,
): ReadonlyArray<{ depth: number; slug: string; text: string }> {
  return headings.filter((h) => h.depth >= minDepth && h.depth <= maxDepth)
}
