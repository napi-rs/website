import { describe, expect, it } from 'vitest'
import type { LocaleNav } from '../nav/index.ts'
import { buildLlmsIndex } from './llms-index.ts'

const NAV: LocaleNav = {
  tabs: [
    { key: 'docs', title: 'Docs' },
    { key: 'blog', title: 'Blog' },
    { key: 'changelog', title: 'Changelog' },
  ],
  sidebar: {
    docs: [
      {
        group: 'introduction',
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
        items: [{ title: 'Exports', path: 'docs/concepts/exports' }],
      },
    ],
    // Flat group (blank title) — items render directly under the tab heading.
    blog: [
      {
        group: 'blog',
        title: '',
        items: [{ title: 'Announce V3', path: 'blog/announce-v3' }],
      },
    ],
    // Changelog pages are islands with no `.md`: the resolver returns a clean URL.
    changelog: [
      {
        group: 'changelog',
        title: '',
        items: [{ title: 'napi', path: 'changelog/napi' }],
      },
    ],
  },
}

// Resolver mirroring the build: `.md` for doc/blog leaves, clean URL for the
// (island-only) changelog leaf.
const hrefFor = (p: string) =>
  p.startsWith('changelog/') ? `/${p}` : `/${p}.md`

describe('buildLlmsIndex()', () => {
  const out = buildLlmsIndex(NAV, {
    title: 'NAPI-RS Documentation',
    summary: 'Compiled Node.js add-ons in Rust.',
    hrefFor,
  })

  it('starts with an H1 title and a blockquote summary', () => {
    expect(
      out.startsWith(
        '# NAPI-RS Documentation\n\n> Compiled Node.js add-ons in Rust.\n',
      ),
    ).toBe(true)
  })

  it('renders one ## section per non-empty tab', () => {
    expect(out).toContain('## Docs')
    expect(out).toContain('## Blog')
    expect(out).toContain('## Changelog')
  })

  it('renders non-flat docs groups as ### sub-headings', () => {
    expect(out).toContain('### Introduction')
    expect(out).toContain('### Concepts')
  })

  it('does NOT emit a ### heading for flat groups (blank title)', () => {
    // The blog/changelog groups have blank titles; only the two docs groups do.
    expect(out.match(/^### /gm)?.length).toBe(2)
  })

  it('links doc/blog leaves to their .md and changelog to a clean URL', () => {
    expect(out).toContain(
      '- [Getting started](/docs/introduction/getting-started.md)',
    )
    expect(out).toContain('- [Exports](/docs/concepts/exports.md)')
    expect(out).toContain('- [Announce V3](/blog/announce-v3.md)')
    expect(out).toContain('- [napi](/changelog/napi)')
  })

  it('ends with exactly one trailing newline and no blank-line runs', () => {
    expect(out.endsWith('\n')).toBe(true)
    expect(out.endsWith('\n\n')).toBe(false)
    expect(out).not.toMatch(/\n{3,}/)
  })

  it('omits a tab whose sidebar group list is empty', () => {
    const navNoBlog: LocaleNav = {
      ...NAV,
      sidebar: { ...NAV.sidebar, blog: [] },
    }
    expect(
      buildLlmsIndex(navNoBlog, { title: 'T', summary: 'S', hrefFor }),
    ).not.toContain('## Blog')
  })
})
