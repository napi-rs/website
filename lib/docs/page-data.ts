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
import { localizeHref, DEFAULT_LOCALE } from './locale.ts'

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
// Page existence (from @void/md/pages) — distinct from nav existence
// ---------------------------------------------------------------------------
//
// IMPORTANT: nav leaves and EMITTED pages diverge. The nav manifest lists
// blog/changelog leaves, but no blog/changelog markdown has been migrated yet —
// so those sections have ZERO @void/md/pages entries. Tab visibility + the
// "first real leaf" target must key off ACTUAL pages (`@void/md/pages`), never
// the nav existence sets, or we'd link tabs at 404s.

/**
 * Build a per-locale Set of UNPREFIXED leaf paths that have an actual emitted
 * page, derived from `@void/md/pages` (whose `path` is locale-prefixed, e.g.
 * `/en/docs/cli/build` -> bucket `en`, leaf `docs/cli/build`).
 */
export function buildPageExistenceSets(
  pages: ReadonlyArray<MdPageLike>,
): Record<Locale, ReadonlySet<string>> {
  const result: Record<Locale, Set<string>> = {
    en: new Set(),
    cn: new Set(),
    'pt-BR': new Set(),
  }
  for (const page of pages) {
    // page.path is `/<locale>/<leaf>`; split once on the first segment.
    const stripped = page.path.replace(/^\/+/, '')
    const slash = stripped.indexOf('/')
    if (slash === -1) continue
    const locale = stripped.slice(0, slash)
    const leaf = stripped.slice(slash + 1)
    if (locale === 'en' || locale === 'cn' || locale === 'pt-BR') {
      result[locale].add(leaf)
    }
  }
  return result
}

/**
 * Whether a nav leaf is REACHABLE in `locale`: it has a page in that locale, or
 * (for non-default locales) the en page exists and the i18n fallback will serve
 * it. Mirrors middleware/02.i18n-fallback's rule so chrome never links a 404.
 */
export function isLeafReachable(
  leafPath: string,
  locale: Locale,
  existsByPage: Record<Locale, ReadonlySet<string>>,
): boolean {
  const leaf = leafPath.replace(/^\/+/, '')
  if (existsByPage[locale]?.has(leaf)) return true
  if (locale !== DEFAULT_LOCALE && existsByPage[DEFAULT_LOCALE]?.has(leaf)) {
    return true
  }
  return false
}

/**
 * The localized href of the FIRST reachable leaf of a section (in sidebar
 * order). This is the real target for a section tab (`/docs` has no index page)
 * and the lang-switch fallback. Returns null when the section has no reachable
 * page in this locale (e.g. blog/changelog have no migrated pages yet).
 */
export function firstSectionLeafHref(
  section: string,
  locale: Locale,
  localeNav: LocaleNav,
  existsByPage: Record<Locale, ReadonlySet<string>>,
): string | null {
  const flat = flattenSection(localeNav.sidebar[section] ?? [])
  for (const item of flat) {
    if (isLeafReachable(item.path, locale, existsByPage)) {
      return localizeHref(item.path, locale)
    }
  }
  return null
}

/**
 * Whether a section has at least one reachable page in `locale`. Drives tab
 * visibility: only tabs whose section currently has migrated content show.
 */
export function sectionHasReachablePage(
  section: string,
  locale: Locale,
  localeNav: LocaleNav,
  existsByPage: Record<Locale, ReadonlySet<string>>,
): boolean {
  return firstSectionLeafHref(section, locale, localeNav, existsByPage) !== null
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
 * - The tab links to the FIRST reachable leaf of the section, NOT the bare
 *   section index — `/docs` (and `/cn/docs`, …) has no index page and 404s.
 *   This is the same target as the navbar tab (firstSectionLeafHref). If the
 *   section has no reachable page it degrades to a non-link (empty href); the
 *   current leaf guarantees at least one, so that is defensive only.
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
  existsByPage: Record<Locale, ReadonlySet<string>>,
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
    {
      label: tab.title,
      href:
        firstSectionLeafHref(section, locale, localeNav, existsByPage) ?? '',
    },
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
 * - Otherwise fall back to the FIRST reachable leaf of the same section in the
 *   target locale (`/docs` itself has no index page — see firstSectionLeafHref),
 *   then to the target locale root.
 *
 * `currentPath` is the live ROUTE path (`useRouter().path`); we derive the
 * source locale + unprefixed remainder from it.
 *
 * `existence` is the NAV-derived per-locale leaf set (the target locale's nav
 * actually lists the page); `existsByPage` is the @void/md page set used to find
 * a reachable section-fallback leaf and is passed to firstSectionLeafHref.
 */
export function computeLangSwitchUrl(
  currentPath: string,
  targetLocale: Locale,
  existence: Record<Locale, ReadonlySet<string>>,
  splitLocaleFn: (p: string) => [Locale, string],
  navForTarget: LocaleNav,
  existsByPage: Record<Locale, ReadonlySet<string>>,
): string {
  const [, rest] = splitLocaleFn(currentPath)
  if (!rest) return localizeHref('', targetLocale)

  if (existence[targetLocale]?.has(rest)) {
    return localizeHref(rest, targetLocale)
  }

  // Fall back to the first reachable leaf of the same section (the section has
  // no index page), or the target locale root if there is none.
  const section = leafSection(rest)
  if (section) {
    const leafHref = firstSectionLeafHref(
      section,
      targetLocale,
      navForTarget,
      existsByPage,
    )
    if (leafHref) return leafHref
  }
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
