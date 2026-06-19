// @vitest-environment node
//
// Unit tests for the pure page-data joins (lib/docs/page-data.ts). Uses
// hand-built nav + md-pages fixtures — never imports @void/md/pages.
//
// Run: GITHUB_TOKEN=dummy vp test run lib/docs/page-data.test.ts
import { describe, it, expect } from 'vite-plus/test'
import type { Locale, LocaleNav } from '../nav/index.ts'
import { splitLocale } from './locale.ts'
import {
  mdPagePath,
  leafSection,
  getPageDataCore,
  getBreadcrumbCore,
  flattenSection,
  getPagerLinksCore,
  buildExistenceSets,
  buildPageExistenceSets,
  isLeafReachable,
  firstSectionLeafHref,
  sectionHasReachablePage,
  computeLangSwitchUrl,
  tocHeadings,
  type MdPageLike,
} from './page-data.ts'

// --- Fixtures --------------------------------------------------------------

const enNav: LocaleNav = {
  tabs: [
    { key: 'docs', title: 'Docs' },
    { key: 'blog', title: 'Blog' },
  ],
  sidebar: {
    docs: [
      {
        group: 'introduction',
        title: 'Introduction',
        items: [
          {
            title: 'A simple package',
            path: 'docs/introduction/simple-package',
          },
        ],
      },
      {
        group: 'concepts',
        title: 'Concepts',
        items: [
          { title: 'Exports', path: 'docs/concepts/exports' },
          { title: 'Class', path: 'docs/concepts/class' },
          { title: 'Enum', path: 'docs/concepts/enum' },
        ],
      },
    ],
    // 'blog' has a nav leaf but (mirroring reality) NO emitted page, so the tab
    // must stay hidden and have no section-leaf href.
    blog: [
      {
        group: 'blog',
        title: 'Blog',
        items: [{ title: 'Announce V3', path: 'blog/announce-v3' }],
      },
    ],
    changelog: [],
  },
}

const cnNav: LocaleNav = {
  tabs: [{ key: 'docs', title: '文档' }],
  sidebar: {
    docs: [
      {
        group: 'concepts',
        title: '概念',
        items: [{ title: '类', path: 'docs/concepts/class' }],
      },
    ],
    blog: [],
    changelog: [],
  },
}

const nav: Record<Locale, LocaleNav> = {
  en: enNav,
  cn: cnNav,
  'pt-BR': { tabs: [], sidebar: { docs: [], blog: [], changelog: [] } },
}

const pages: MdPageLike[] = [
  {
    path: '/en/docs/concepts/class',
    title: 'Class',
    frontmatter: { description: 'Classes in napi-rs' },
    headings: [
      { depth: 1, slug: 'class', text: 'Class' },
      { depth: 2, slug: 'constructor', text: 'Constructor' },
      { depth: 3, slug: 'methods', text: 'Methods' },
      { depth: 4, slug: 'detail', text: 'Detail' },
    ],
  },
  {
    path: '/cn/docs/concepts/class',
    title: '类',
    frontmatter: {},
    headings: [{ depth: 2, slug: 'gou-zao', text: '构造' }],
  },
  // First-in-order docs leaf (introduction) has an EN page only — used to test
  // that the EN section tab + the cn fallback resolve to it.
  {
    path: '/en/docs/introduction/simple-package',
    title: 'A simple package',
    frontmatter: {},
    headings: [],
  },
  {
    path: '/en/docs/concepts/exports',
    title: 'Exports',
    frontmatter: {},
    headings: [],
  },
  // NOTE: no /en/blog/* page exists, mirroring the un-migrated blog content.
]

// --- mdPagePath / leafSection ---------------------------------------------

describe('mdPagePath', () => {
  it('always prefixes the locale, even for en', () => {
    expect(mdPagePath('docs/concepts/class', 'en')).toBe(
      '/en/docs/concepts/class',
    )
    expect(mdPagePath('docs/concepts/class', 'cn')).toBe(
      '/cn/docs/concepts/class',
    )
  })
  it('tolerates a leading slash', () => {
    expect(mdPagePath('/docs/x', 'pt-BR')).toBe('/pt-BR/docs/x')
  })
})

describe('leafSection', () => {
  it('returns the first segment', () => {
    expect(leafSection('docs/concepts/class')).toBe('docs')
    expect(leafSection('blog/post')).toBe('blog')
  })
})

// --- getPageDataCore -------------------------------------------------------

describe('getPageDataCore', () => {
  it('joins a nav leaf to its locale-specific md entry', () => {
    const en = getPageDataCore('docs/concepts/class', 'en', pages)
    expect(en?.title).toBe('Class')
    const cn = getPageDataCore('docs/concepts/class', 'cn', pages)
    expect(cn?.title).toBe('类')
  })
  it('returns undefined when the locale entry is absent (no implicit fallback)', () => {
    expect(getPageDataCore('docs/concepts/enum', 'cn', pages)).toBeUndefined()
  })
})

// --- getBreadcrumbCore -----------------------------------------------------

describe('getBreadcrumbCore', () => {
  const existence = buildPageExistenceSets(pages)
  it('builds tab > group > leaf for en (no "Home" crumb, matching live); tab crumb points at the first reachable leaf, NOT the bare /docs index (404)', () => {
    const crumb = getBreadcrumbCore(
      'docs/concepts/class',
      'en',
      enNav,
      existence,
    )
    expect(crumb).toEqual([
      // first reachable leaf of `docs`, same target as the navbar tab — NOT `/docs`
      { label: 'Docs', href: '/docs/introduction/simple-package' },
      { label: 'Concepts', href: '' },
      { label: 'Class', href: '/docs/concepts/class' },
    ])
  })
  it('uses prefixed hrefs for cn (still no "Home" crumb); tab crumb is the first reachable cn leaf', () => {
    const crumb = getBreadcrumbCore(
      'docs/concepts/class',
      'cn',
      cnNav,
      existence,
    )
    expect(crumb).toEqual([
      { label: '文档', href: '/cn/docs/concepts/class' },
      { label: '概念', href: '' },
      { label: '类', href: '/cn/docs/concepts/class' },
    ])
  })
  it('returns [] when the leaf is not in the locale nav', () => {
    expect(
      getBreadcrumbCore('docs/concepts/missing', 'en', enNav, existence),
    ).toEqual([])
  })
})

// --- flatten + pager -------------------------------------------------------

describe('flattenSection', () => {
  it('flattens all group items in order', () => {
    expect(flattenSection(enNav.sidebar.docs).map((i) => i.path)).toEqual([
      'docs/introduction/simple-package',
      'docs/concepts/exports',
      'docs/concepts/class',
      'docs/concepts/enum',
    ])
  })
})

describe('getPagerLinksCore', () => {
  it('finds prev/next across group boundaries', () => {
    const { prev, next } = getPagerLinksCore('docs/concepts/class', 'en', enNav)
    expect(prev).toEqual({ title: 'Exports', href: '/docs/concepts/exports' })
    expect(next).toEqual({ title: 'Enum', href: '/docs/concepts/enum' })
  })
  it('prev crosses from the first concept back to the introduction group', () => {
    const { prev } = getPagerLinksCore('docs/concepts/exports', 'en', enNav)
    expect(prev).toEqual({
      title: 'A simple package',
      href: '/docs/introduction/simple-package',
    })
  })
  it('null at the very start (prev) and very end (next)', () => {
    const first = getPagerLinksCore(
      'docs/introduction/simple-package',
      'en',
      enNav,
    )
    expect(first.prev).toBeNull()
    const last = getPagerLinksCore('docs/concepts/enum', 'en', enNav)
    expect(last.next).toBeNull()
  })
  it('uses prefixed hrefs for cn', () => {
    const { prev, next } = getPagerLinksCore('docs/concepts/class', 'cn', cnNav)
    expect(prev).toBeNull()
    expect(next).toBeNull()
  })
  it('null/null when the leaf is missing from the section', () => {
    expect(getPagerLinksCore('docs/concepts/ghost', 'en', enNav)).toEqual({
      prev: null,
      next: null,
    })
  })
})

// --- computeLangSwitchUrl --------------------------------------------------

describe('computeLangSwitchUrl', () => {
  const existence = buildExistenceSets(nav)
  const existsByPage = buildPageExistenceSets(pages)

  it('links to the same page when the target locale has it', () => {
    // en /docs/concepts/class -> cn has it -> /cn/docs/concepts/class
    expect(
      computeLangSwitchUrl(
        '/docs/concepts/class',
        'cn',
        existence,
        splitLocale,
        cnNav,
        existsByPage,
      ),
    ).toBe('/cn/docs/concepts/class')
  })
  it('switching cn -> en drops the prefix', () => {
    expect(
      computeLangSwitchUrl(
        '/cn/docs/concepts/class',
        'en',
        existence,
        splitLocale,
        enNav,
        existsByPage,
      ),
    ).toBe('/docs/concepts/class')
  })
  it('falls back to the first reachable section leaf (NOT the index) when the page is absent there', () => {
    // en /docs/concepts/enum -> cn nav lacks it -> first reachable cn docs leaf.
    // cn docs sidebar's first leaf is concepts/class, which has a cn page.
    expect(
      computeLangSwitchUrl(
        '/docs/concepts/enum',
        'cn',
        existence,
        splitLocale,
        cnNav,
        existsByPage,
      ),
    ).toBe('/cn/docs/concepts/class')
  })
  it('falls back to target root when the path has no section', () => {
    expect(
      computeLangSwitchUrl(
        '/cn',
        'pt-BR',
        existence,
        splitLocale,
        nav['pt-BR'],
        existsByPage,
      ),
    ).toBe('/pt-BR')
    expect(
      computeLangSwitchUrl(
        '/',
        'cn',
        existence,
        splitLocale,
        cnNav,
        existsByPage,
      ),
    ).toBe('/cn')
  })
})

describe('buildExistenceSets', () => {
  it('collects unprefixed leaf paths per locale', () => {
    const sets = buildExistenceSets(nav)
    expect(sets.en.has('docs/concepts/enum')).toBe(true)
    expect(sets.cn.has('docs/concepts/class')).toBe(true)
    expect(sets.cn.has('docs/concepts/enum')).toBe(false)
  })
})

// --- page existence / reachability (from @void/md/pages) -------------------

describe('buildPageExistenceSets', () => {
  it('buckets unprefixed leaves by the md path locale segment', () => {
    // Pass empty island pages so this asserts ONLY the md-derived buckets.
    const sets = buildPageExistenceSets(pages, { en: [], cn: [], 'pt-BR': [] })
    expect(sets.en.has('docs/concepts/class')).toBe(true)
    expect(sets.en.has('docs/introduction/simple-package')).toBe(true)
    expect(sets.cn.has('docs/concepts/class')).toBe(true)
    // No blog page was emitted -> not present in any bucket.
    expect(sets.en.has('blog/announce-v3')).toBe(false)
  })

  it('merges the ISLAND_PAGES supplement (markdown-less changelog routes)', () => {
    // The real default supplement adds the 5 en changelog island leaves.
    const sets = buildPageExistenceSets(pages)
    expect(sets.en.has('changelog/napi')).toBe(true)
    expect(sets.en.has('changelog/napi-cli')).toBe(true)
    // EN-only: cn/pt-BR get no changelog leaves of their own.
    expect(sets.cn.has('changelog/napi')).toBe(false)
  })

  it('accepts an injected island-page supplement', () => {
    const sets = buildPageExistenceSets(pages, {
      en: ['/changelog/foo'],
      cn: [],
      'pt-BR': [],
    })
    // Leading slash is normalised away to match the unprefixed leaf form.
    expect(sets.en.has('changelog/foo')).toBe(true)
  })
})

describe('isLeafReachable', () => {
  const existsByPage = buildPageExistenceSets(pages)
  it('true when the locale has its own page', () => {
    expect(isLeafReachable('docs/concepts/class', 'cn', existsByPage)).toBe(
      true,
    )
  })
  it('true for a non-default locale via en fallback', () => {
    // cn has no exports page, but en does -> i18n fallback makes it reachable.
    expect(isLeafReachable('docs/concepts/exports', 'cn', existsByPage)).toBe(
      true,
    )
  })
  it('false when neither the locale nor en has a page (e.g. blog)', () => {
    expect(isLeafReachable('blog/announce-v3', 'en', existsByPage)).toBe(false)
    expect(isLeafReachable('blog/announce-v3', 'cn', existsByPage)).toBe(false)
  })
})

describe('firstSectionLeafHref', () => {
  const existsByPage = buildPageExistenceSets(pages)
  it('returns the first reachable leaf href for the docs section (en at root)', () => {
    // sidebar order: introduction/simple-package first, and it has an en page.
    expect(firstSectionLeafHref('docs', 'en', enNav, existsByPage)).toBe(
      '/docs/introduction/simple-package',
    )
  })
  it('prefixes the leaf for cn (first reachable cn-or-en page)', () => {
    expect(firstSectionLeafHref('docs', 'cn', cnNav, existsByPage)).toBe(
      '/cn/docs/concepts/class',
    )
  })
  it('returns null for a section with no emitted page (blog)', () => {
    expect(firstSectionLeafHref('blog', 'en', enNav, existsByPage)).toBeNull()
  })
})

describe('sectionHasReachablePage', () => {
  const existsByPage = buildPageExistenceSets(pages)
  it('true for docs, false for blog (no migrated content)', () => {
    expect(sectionHasReachablePage('docs', 'en', enNav, existsByPage)).toBe(
      true,
    )
    expect(sectionHasReachablePage('blog', 'en', enNav, existsByPage)).toBe(
      false,
    )
  })
})

// --- tocHeadings -----------------------------------------------------------

describe('tocHeadings', () => {
  it('keeps h2–h4 by default (matching live napi.rs), dropping only h1', () => {
    const filtered = tocHeadings(pages[0].headings)
    expect(filtered.map((h) => h.slug)).toEqual([
      'constructor',
      'methods',
      'detail',
    ])
  })
})
