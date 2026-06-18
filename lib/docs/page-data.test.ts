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
    blog: [],
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
  it('builds Home > tab > group > leaf for en (unprefixed hrefs)', () => {
    const crumb = getBreadcrumbCore('docs/concepts/class', 'en', enNav)
    expect(crumb).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Docs', href: '/docs' },
      { label: 'Concepts', href: '' },
      { label: 'Class', href: '/docs/concepts/class' },
    ])
  })
  it('uses prefixed hrefs + localized Home for cn', () => {
    const crumb = getBreadcrumbCore('docs/concepts/class', 'cn', cnNav)
    expect(crumb).toEqual([
      { label: '首页', href: '/cn' },
      { label: '文档', href: '/cn/docs' },
      { label: '概念', href: '' },
      { label: '类', href: '/cn/docs/concepts/class' },
    ])
  })
  it('returns [] when the leaf is not in the locale nav', () => {
    expect(getBreadcrumbCore('docs/concepts/missing', 'en', enNav)).toEqual([])
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

  it('links to the same page when the target locale has it', () => {
    // en /docs/concepts/class -> cn has it -> /cn/docs/concepts/class
    expect(
      computeLangSwitchUrl(
        '/docs/concepts/class',
        'cn',
        existence,
        splitLocale,
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
      ),
    ).toBe('/docs/concepts/class')
  })
  it('falls back to the target section index when the page is absent there', () => {
    // en /docs/concepts/enum -> cn lacks it -> cn docs index
    expect(
      computeLangSwitchUrl('/docs/concepts/enum', 'cn', existence, splitLocale),
    ).toBe('/cn/docs')
  })
  it('falls back to target root when the path has no section', () => {
    expect(computeLangSwitchUrl('/cn', 'pt-BR', existence, splitLocale)).toBe(
      '/pt-BR',
    )
    expect(computeLangSwitchUrl('/', 'cn', existence, splitLocale)).toBe('/cn')
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

// --- tocHeadings -----------------------------------------------------------

describe('tocHeadings', () => {
  it('keeps only h2–h3 by default', () => {
    const filtered = tocHeadings(pages[0].headings)
    expect(filtered.map((h) => h.slug)).toEqual(['constructor', 'methods'])
  })
})
