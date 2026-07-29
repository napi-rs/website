// @vitest-environment node
//
// Pure unit test for the route derivation in scripts/generate-sitemap.mjs.
// No filesystem access — every case is driven through the exported pure
// `fileToRoute(relPathFromPagesDir)` helper, which encodes the en-at-root vs
// cn/pt-BR-prefixed routing asymmetry (lib/docs/locale.ts + void.json).
import { describe, it, expect } from 'vitest'
import {
  buildLlmsFull,
  fileToRoute,
  llmsFullPathFor,
  navLeafEntries,
  renderSitemap,
  stripPageHeader,
} from './generate-sitemap.mjs'

describe('fileToRoute', () => {
  it('derives public routes from page file paths', () => {
    const cases: Array<[string, string | null]> = [
      // en (default) is served at the ROOT — route is UNPREFIXED.
      [
        'en/docs/introduction/getting-started.md',
        '/docs/introduction/getting-started',
      ],
      // cn / pt-BR keep their `/<locale>/` prefix.
      ['cn/docs/concepts/class.md', '/cn/docs/concepts/class'],
      ['pt-BR/docs/cli/build.md', '/pt-BR/docs/cli/build'],
      // Landing pages: `index` basename collapses to its directory.
      ['en/index.island.tsx', '/'],
      ['cn/index.island.tsx', '/cn'],
      ['pt-BR/index.island.tsx', '/pt-BR'],
      // Changelog islands (filenames may carry underscores; that is NOT a
      // private `_`-prefixed path segment).
      ['en/changelog/napi.island.tsx', '/changelog/napi'],
      ['en/changelog/napi-cli.island.tsx', '/changelog/napi-cli'],
      // Blog prose.
      ['en/blog/announce-v3.md', '/blog/announce-v3'],
      // Excluded: layout entries are not pages.
      ['en/docs/layout.island.tsx', null],
      ['en/changelog/layout.island.tsx', null],
    ]
    for (const [input, expected] of cases) {
      expect(fileToRoute(input), input).toBe(expected)
    }
  })
})

describe('renderSitemap', () => {
  it('emits lastmod and xhtml:link alternates', () => {
    const xml = renderSitemap([
      {
        route: '/docs/concepts/class',
        lastmod: '2026-04-20T10:00:00Z',
        alternates: [
          { hreflang: 'en', href: 'https://napi.rs/docs/concepts/class' },
          { hreflang: 'zh-CN', href: 'https://napi.rs/cn/docs/concepts/class' },
          {
            hreflang: 'x-default',
            href: 'https://napi.rs/docs/concepts/class',
          },
        ],
      },
    ])
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    expect(xml).toContain('<loc>https://napi.rs/docs/concepts/class</loc>')
    expect(xml).toContain('<lastmod>2026-04-20T10:00:00Z</lastmod>')
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="zh-CN" href="https://napi.rs/cn/docs/concepts/class"/>',
    )
  })
  it('omits lastmod when null and alternates when single-locale', () => {
    const xml = renderSitemap([
      { route: '/blog/only-en', lastmod: null, alternates: [] },
    ])
    expect(xml).not.toContain('<lastmod>')
    expect(xml).not.toContain('xhtml:link')
  })
})

describe('llmsFullPathFor', () => {
  it('puts en at the root and other locales under their prefix', () => {
    expect(llmsFullPathFor('en')).toBe('llms-full.txt')
    expect(llmsFullPathFor('cn')).toBe('cn/llms-full.txt')
    expect(llmsFullPathFor('pt-BR')).toBe('pt-BR/llms-full.txt')
  })
})

describe('navLeafEntries', () => {
  it('flattens docs+blog sidebar leaves in nav order (changelog excluded)', () => {
    const localeNav = {
      tabs: [],
      sidebar: {
        docs: [
          {
            group: 'intro',
            title: 'Introduction',
            items: [
              {
                title: 'Getting started',
                path: 'docs/introduction/getting-started',
              },
            ],
          },
          {
            group: 'concepts',
            title: 'Concepts',
            items: [{ title: 'Enum', path: 'docs/concepts/enum' }],
          },
        ],
        blog: [
          {
            group: 'blog',
            title: '',
            items: [{ title: 'Announcing v3', path: 'blog/announce-v3' }],
          },
        ],
        changelog: [
          {
            group: 'changelog',
            title: '',
            items: [{ title: 'napi', path: 'changelog/napi' }],
          },
        ],
      },
    }
    expect(navLeafEntries(localeNav)).toEqual([
      {
        title: 'Getting started',
        leafPath: 'docs/introduction/getting-started',
      },
      { title: 'Enum', leafPath: 'docs/concepts/enum' },
      { title: 'Announcing v3', leafPath: 'blog/announce-v3' },
    ])
  })
})

describe('stripPageHeader', () => {
  it('drops script island, frontmatter and the leading H1', () => {
    const md = [
      '<script>',
      'import X from "./x.tsx"',
      '</script>',
      '',
      '---',
      "title: 'Announcing NAPI-RS v3'",
      '---',
      '',
      '# Announcing NAPI-RS v3',
      '',
      'Body **kept**.',
    ].join('\n')
    expect(stripPageHeader(md)).toBe('Body **kept**.')
  })

  it('keeps non-leading headings and body intact', () => {
    const md = '---\ntitle: x\n---\n\n# Title\n\nIntro.\n\n## Section\n\nMore.'
    expect(stripPageHeader(md)).toBe('Intro.\n\n## Section\n\nMore.')
  })
})

describe('buildLlmsFull', () => {
  const entries = [
    { title: 'Getting started', leafPath: 'docs/introduction/getting-started' },
    { title: 'Enum', leafPath: 'docs/concepts/enum' },
    { title: 'Island only', leafPath: 'changelog/napi' },
  ]

  it('concatenates pages in order with # title headings and --- separators', () => {
    const sources: Record<string, string | undefined> = {
      'docs/introduction/getting-started': '# Getting started\n\nFirst body.',
      'docs/concepts/enum': '# Enum\n\nSecond body.',
      'changelog/napi': undefined,
    }
    const full = buildLlmsFull(entries, (leaf: string) => sources[leaf])
    expect(full).toBe(
      [
        '# Getting started',
        '',
        'First body.',
        '',
        '---',
        '',
        '# Enum',
        '',
        'Second body.',
        '',
      ].join('\n'),
    )
  })

  it('skips entries without a markdown source (island-only routes)', () => {
    const full = buildLlmsFull(entries, () => undefined)
    expect(full).toBe('\n')
  })
})
