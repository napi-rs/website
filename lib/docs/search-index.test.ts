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
