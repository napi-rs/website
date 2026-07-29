// @vitest-environment node
//
// Unit tests for the pure search-index builder (lib/docs/search-index.ts).
// Hand-built md-pages fixture; never imports @void/md/pages.
//
// Run: GITHUB_TOKEN=dummy vp test run lib/docs/search-index.test.ts
import { describe, it, expect } from 'vite-plus/test'
import {
  buildSearchIndexCore,
  pageLocale,
  pageLeaf,
  pageHref,
} from './search-index.ts'
import type { MdPageLike } from './page-data.ts'

const pages: MdPageLike[] = [
  {
    path: '/en/docs/concepts/enum',
    title: 'Enum',
    frontmatter: { description: 'Enums in napi-rs' },
    headings: [
      { depth: 1, slug: 'enum', text: 'Enum' },
      { depth: 2, slug: 'string-enum', text: 'String enum' },
    ],
  },
  {
    path: '/cn/docs/concepts/class',
    title: '类',
    frontmatter: {},
    headings: [{ depth: 2, slug: 'gou-zao', text: '构造' }],
  },
  {
    path: '/pt-BR/docs/cli/build',
    title: 'Build',
    frontmatter: { description: 'CLI build' },
    headings: [],
  },
  // EN-only leaf that also has a matching EN page in the concepts group. The cn
  // page (concepts/class) is localized, so its leaf must NOT be duplicated by a
  // fallback; but concepts/enum is en-only, so it IS a fallback candidate for cn.
  {
    path: '/en/docs/concepts/class',
    title: 'Class',
    frontmatter: { description: 'Classes in napi-rs' },
    headings: [{ depth: 2, slug: 'constructor', text: 'Constructor' }],
  },
  // A genuinely fallback-only leaf: exists only in EN, so it should surface in
  // BOTH cn and pt-BR buckets with a localized href + the EN content.
  {
    path: '/en/docs/cli/create-npm-dirs',
    title: 'create-npm-dirs',
    frontmatter: { description: 'Create npm dirs' },
    headings: [{ depth: 2, slug: 'usage', text: 'Usage' }],
  },
]

describe('pageLocale', () => {
  it('reads the locale segment', () => {
    expect(pageLocale('/en/docs/concepts/enum')).toBe('en')
    expect(pageLocale('/cn/docs/concepts/class')).toBe('cn')
    expect(pageLocale('/pt-BR/docs/cli/build')).toBe('pt-BR')
  })
})

describe('pageLeaf', () => {
  it('strips the leading locale segment', () => {
    expect(pageLeaf('/en/docs/concepts/enum')).toBe('docs/concepts/enum')
    expect(pageLeaf('/cn/docs/concepts/class')).toBe('docs/concepts/class')
    expect(pageLeaf('/pt-BR/docs/cli/build')).toBe('docs/cli/build')
  })
})

describe('pageHref — PUBLIC navigable href (not the internal /en/… md path)', () => {
  it('drops the en prefix to the canonical root path', () => {
    expect(pageHref('/en/docs/concepts/enum')).toBe('/docs/concepts/enum')
  })
  it('keeps the prefix for cn / pt-BR', () => {
    expect(pageHref('/cn/docs/concepts/class')).toBe('/cn/docs/concepts/class')
    expect(pageHref('/pt-BR/docs/cli/build')).toBe('/pt-BR/docs/cli/build')
  })
})

describe('buildSearchIndexCore', () => {
  const index = buildSearchIndexCore(pages)

  it('buckets ACTUAL entries by locale, then appends en fallbacks', () => {
    // en: 3 real pages (enum, class, create-npm-dirs); en NEVER gets fallbacks.
    expect(index.en).toHaveLength(3)
    // cn: 1 real (concepts/class) + 2 en fallbacks (concepts/enum,
    // cli/create-npm-dirs — concepts/class is already localized, so it is skipped).
    expect(index.cn).toHaveLength(3)
    // pt-BR: 1 real (cli/build) + 3 en fallbacks (every en leaf is unlocalized).
    expect(index['pt-BR']).toHaveLength(4)
  })
  it('captures path, PUBLIC href, title, heading texts, and description', () => {
    expect(index.en[0]).toEqual({
      path: '/en/docs/concepts/enum',
      href: '/docs/concepts/enum',
      title: 'Enum',
      headings: ['Enum', 'String enum'],
      description: 'Enums in napi-rs',
    })
  })
  it('a cn entry keeps its /cn/… public href', () => {
    expect(index.cn[0].href).toBe('/cn/docs/concepts/class')
  })
  it('omits description when frontmatter lacks one', () => {
    expect(index.cn[0].description).toBeUndefined()
    expect(index.cn[0].headings).toEqual(['构造'])
  })
})

describe('buildSearchIndexCore — EN i18n fallback parity', () => {
  const index = buildSearchIndexCore(pages)

  const cnFallback = index.cn.find(
    (e) => e.path === '/cn/docs/cli/create-npm-dirs',
  )
  const ptFallback = index['pt-BR'].find(
    (e) => e.path === '/pt-BR/docs/cli/create-npm-dirs',
  )

  it('a fallback-only leaf appears in BOTH cn and pt-BR with a LOCALIZED href + EN content', () => {
    expect(cnFallback).toEqual({
      path: '/cn/docs/cli/create-npm-dirs',
      href: '/cn/docs/cli/create-npm-dirs',
      title: 'create-npm-dirs',
      headings: ['Usage'],
      description: 'Create npm dirs',
    })
    expect(ptFallback).toEqual({
      path: '/pt-BR/docs/cli/create-npm-dirs',
      href: '/pt-BR/docs/cli/create-npm-dirs',
      title: 'create-npm-dirs',
      headings: ['Usage'],
      description: 'Create npm dirs',
    })
  })

  it('never reuses the raw /en/… path for a fallback entry', () => {
    expect(index.cn.some((e) => e.path.startsWith('/en/'))).toBe(false)
    expect(index['pt-BR'].some((e) => e.path.startsWith('/en/'))).toBe(false)
  })

  it('a genuinely localized cn page appears once (not duplicated by a fallback)', () => {
    const classEntries = index.cn.filter(
      (e) => e.href === '/cn/docs/concepts/class',
    )
    expect(classEntries).toHaveLength(1)
    // It is the REAL cn entry: localized title, not the en copy.
    expect(classEntries[0].title).toBe('类')
    expect(classEntries[0].path).toBe('/cn/docs/concepts/class')
  })

  it('does NOT leak a second copy of an en-only leaf into the en bucket', () => {
    // concepts/enum is en-only: exactly once in en, and the en bucket only ever
    // holds the real en pages (no fallback siblings, no localized paths).
    expect(
      index.en.filter((e) => e.href === '/docs/concepts/enum'),
    ).toHaveLength(1)
    expect(index.en.every((e) => e.path.startsWith('/en/'))).toBe(true)
  })

  it('appends fallbacks AFTER localized entries, in en source order', () => {
    expect(index.cn.map((e) => e.path)).toEqual([
      '/cn/docs/concepts/class', // real localized entry first
      '/cn/docs/concepts/enum', // then en fallbacks, in en source order
      '/cn/docs/cli/create-npm-dirs',
    ])
  })
})

// ---------------------------------------------------------------------------
// Full-body search ranking (rankSearchEntries / bodySnippet)
// ---------------------------------------------------------------------------

import {
  rankSearchEntries,
  bodySnippet,
  groupSearchResults,
} from './search-index.ts'
import type { FullSearchEntry } from './search-index.ts'

const full = (over: Partial<FullSearchEntry>): FullSearchEntry => ({
  path: '/en/docs/x',
  href: '/docs/x',
  title: 'X',
  section: 'docs',
  group: 'G',
  headings: [],
  body: '',
  ...over,
})

describe('bodySnippet', () => {
  it('windows ~80 chars around the match with ellipses', () => {
    const body = `${'a'.repeat(100)} needle ${'b'.repeat(100)}`
    const s = bodySnippet(body, 'needle')
    expect(s.startsWith('…')).toBe(true)
    expect(s.endsWith('…')).toBe(true)
    expect(s).toContain('needle')
    expect(s.length).toBeLessThanOrEqual(90)
  })
  it('returns the body head when there is no match', () => {
    expect(bodySnippet('short body', 'zzz')).toBe('short body')
  })
})

describe('rankSearchEntries', () => {
  const entries: FullSearchEntry[] = [
    full({
      path: '/en/docs/a',
      title: 'String enum',
      body: 'Enums with string values',
    }),
    full({
      path: '/en/docs/b',
      title: 'Enum',
      headings: [{ depth: 2, slug: 'numeric-enum', text: 'Numeric enum' }],
      body: 'body',
    }),
    full({
      path: '/en/docs/c',
      title: 'Class',
      body: 'A class can hold enum-shaped constants.',
    }),
    full({
      path: '/en/docs/d',
      title: 'Other',
      headings: [{ depth: 2, slug: 'enums-here', text: 'Enums here' }],
      body: 'nothing',
    }),
  ]

  it('tiers: title-prefix > title-includes > heading > body', () => {
    const out = rankSearchEntries(entries, 'enum')
    expect(out.map((r) => r.entry.path)).toEqual([
      '/en/docs/b', // "Enum" startsWith
      '/en/docs/a', // "String enum" includes
      '/en/docs/d', // heading "Enums here"
      '/en/docs/c', // body-only
    ])
    expect(out.map((r) => r.score)).toEqual([4, 3, 2, 1])
  })

  it('carries the matched heading (for the # sub-row + anchor href)', () => {
    const out = rankSearchEntries(entries, 'numeric')
    expect(out).toHaveLength(1)
    expect(out[0].heading?.slug).toBe('numeric-enum')
  })

  it('carries a body snippet for body-only matches', () => {
    const out = rankSearchEntries(entries, 'constants')
    expect(out).toHaveLength(1)
    expect(out[0].snippet).toContain('constants')
  })

  it('is case-insensitive', () => {
    expect(rankSearchEntries(entries, 'ENUM')[0].entry.path).toBe('/en/docs/b')
  })

  it('caps results at the limit', () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      full({ path: `/en/docs/p${i}`, title: `enum page ${i}` }),
    )
    expect(rankSearchEntries(many, 'enum')).toHaveLength(30)
  })

  it('an empty query returns the first entries in input order (browse view)', () => {
    const out = rankSearchEntries(entries, '  ')
    expect(out.map((r) => r.entry.path)).toEqual([
      '/en/docs/a',
      '/en/docs/b',
      '/en/docs/c',
      '/en/docs/d',
    ])
  })
})

describe('groupSearchResults', () => {
  it('consolidates NON-adjacent results with the same label into one group', () => {
    const results = [
      { entry: full({ path: '/en/docs/a', group: 'Concepts' }), score: 4 },
      { entry: full({ path: '/en/docs/b', group: 'CLI' }), score: 3 },
      { entry: full({ path: '/en/docs/c', group: 'Concepts' }), score: 2 },
    ]
    const groups = groupSearchResults(results, (e) => e.group)
    // One group per label (no duplicate React keys), first-appearance order.
    expect(groups.map((g) => g.label)).toEqual(['Concepts', 'CLI'])
    expect(groups[0].items.map((r) => r.entry.path)).toEqual([
      '/en/docs/a',
      '/en/docs/c',
    ])
    expect(groups[1].items).toHaveLength(1)
  })

  it('preserves first-appearance order of groups and items', () => {
    const results = [
      { entry: full({ path: '/en/docs/z', group: 'B' }), score: 4 },
      { entry: full({ path: '/en/docs/y', group: 'A' }), score: 3 },
      { entry: full({ path: '/en/docs/x', group: 'B' }), score: 2 },
    ]
    const groups = groupSearchResults(results, (e) => e.group)
    expect(groups.map((g) => g.label)).toEqual(['B', 'A'])
    expect(groups[0].items.map((r) => r.entry.path)).toEqual([
      '/en/docs/z',
      '/en/docs/x',
    ])
  })
})
