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

  it('buckets entries by locale', () => {
    expect(index.en).toHaveLength(1)
    expect(index.cn).toHaveLength(1)
    expect(index['pt-BR']).toHaveLength(1)
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
