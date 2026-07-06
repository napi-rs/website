// @vitest-environment node
//
// Pure unit test for the route derivation in scripts/generate-sitemap.mjs.
// No filesystem access — every case is driven through the exported pure
// `fileToRoute(relPathFromPagesDir)` helper, which encodes the en-at-root vs
// cn/pt-BR-prefixed routing asymmetry (lib/docs/locale.ts + void.json).
import { describe, it, expect } from 'vitest'
import { fileToRoute, renderSitemap } from './generate-sitemap.mjs'

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
