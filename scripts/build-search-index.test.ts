import { describe, expect, it } from 'vitest'

import {
  BODY_LIMIT,
  buildSearchIndex,
  collectHeadings,
  groupForLeaf,
  markdownToPlainText,
  publicHrefFromPath,
  slugify,
} from './build-search-index.mjs'

const nav = {
  en: {
    tabs: [],
    sidebar: {
      docs: [
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
          items: [{ title: 'Post', path: 'blog/post' }],
        },
      ],
    },
  },
  cn: {
    tabs: [],
    sidebar: {
      docs: [
        {
          group: 'concepts',
          title: '概念',
          items: [
            { title: 'Enum', path: 'docs/concepts/enum' },
            { title: 'String', path: 'docs/concepts/string' },
          ],
        },
      ],
    },
  },
  'pt-BR': { tabs: [], sidebar: {} },
}

const ENUM_MD = `---
title: 'Enum'
description: Map Rust enums to JS.
---

# Enum

::: warning
Careful with enums.
:::

## String enum

Some [link text](/docs/x) and ![alt](/img.png).

\`\`\`rust
pub enum Kind { Duck }
\`\`\`
`

describe('markdownToPlainText', () => {
  it('strips frontmatter and the byte-0 script island block', () => {
    const md = `<script>\nimport X from "./x.tsx"\n</script>\n\n---\ntitle: nope\n---\n\n# Real\n\nBody text.`
    // frontmatter after a script block is not byte-0 frontmatter, but both
    // strippers run against the original; body must contain neither.
    const text = markdownToPlainText(md)
    expect(text).not.toContain('import X')
    expect(text).toContain('Real')
    expect(text).toContain('Body text.')
  })

  it('strips frontmatter at byte 0', () => {
    const text = markdownToPlainText(ENUM_MD)
    expect(text).not.toContain('Map Rust enums')
    expect(text).not.toContain('title')
  })

  it('keeps link text, drops urls, images, callout and heading markers', () => {
    const text = markdownToPlainText(ENUM_MD)
    expect(text).toContain('link text')
    expect(text).not.toContain('/docs/x')
    expect(text).not.toContain('img.png')
    expect(text).not.toContain(':::')
    expect(text).not.toContain('##')
    expect(text).toContain('String enum')
  })

  it('keeps code fence contents but drops fence markers and info string', () => {
    const text = markdownToPlainText(ENUM_MD)
    expect(text).toContain('pub enum Kind { Duck }')
    expect(text).not.toContain('```')
    expect(text).not.toContain('rust')
  })
})

describe('collectHeadings / slugify', () => {
  // These expectations are pinned to the ACTUAL markdown-it-anchor default
  // slugify (verified by rendering through @void/md's compile):
  //   ## `create_string`   -> id="create_string"   (underscore kept)
  //   ## Promise<T>        -> id="promise"         (inline HTML dropped)
  //   ## 安全预览           -> id="%E5%AE%89…"      (CJK percent-encoded)
  //   ## Dup ×3            -> dup, dup-1, dup-2
  it('collects depth 2–4 headings with renderer-identical slugs', () => {
    const md = [
      '# Title',
      '## String enum',
      '### `const` & `static` (advanced)!',
      '#### Deep one',
      '##### Too deep',
      '## String enum',
      '## `create_string`',
      '## Promise<T>',
    ].join('\n')
    expect(collectHeadings(md)).toEqual([
      { depth: 2, slug: 'string-enum', text: 'String enum' },
      {
        depth: 3,
        slug: 'const-%26-static-(advanced)!',
        text: 'const & static (advanced)!',
      },
      { depth: 4, slug: 'deep-one', text: 'Deep one' },
      { depth: 2, slug: 'string-enum-1', text: 'String enum' },
      { depth: 2, slug: 'create_string', text: 'create_string' },
      { depth: 2, slug: 'promise', text: 'Promise' },
    ])
  })

  it('dedupes repeats as base, base-1, base-2 (markdown-it-anchor order)', () => {
    const md = ['## Dup', '## Dup', '## Dup'].join('\n')
    expect(collectHeadings(md).map((h) => h.slug)).toEqual([
      'dup',
      'dup-1',
      'dup-2',
    ])
  })

  it('honors an explicit {#custom-id} over the computed slug', () => {
    const md = '## Namespaces {#namespaces}'
    expect(collectHeadings(md)).toEqual([
      { depth: 2, slug: 'namespaces', text: 'Namespaces' },
    ])
  })

  it('percent-encodes CJK like the renderer', () => {
    expect(slugify('安全预览')).toBe('%E5%AE%89%E5%85%A8%E9%A2%84%E8%A7%88')
  })

  it('slugify matches markdown-it-anchor defaults', () => {
    expect(slugify('Hello, World!')).toBe('hello%2C-world!')
    expect(slugify('  Spaces   everywhere  ')).toBe('spaces-everywhere')
  })
})

describe('groupForLeaf', () => {
  it('returns the sidebar group title', () => {
    expect(groupForLeaf(nav.en, 'docs/concepts/enum')).toBe('Concepts')
  })

  it("returns '' for flat groups and absent leaves", () => {
    expect(groupForLeaf(nav.en, 'blog/post')).toBe('')
    expect(groupForLeaf(nav.en, 'docs/nope')).toBe('')
    expect(groupForLeaf(nav['pt-BR'], 'docs/concepts/enum')).toBe('')
  })
})

describe('publicHrefFromPath', () => {
  it('drops the en prefix, keeps other locales', () => {
    expect(publicHrefFromPath('/en/docs/concepts/enum')).toBe(
      '/docs/concepts/enum',
    )
    expect(publicHrefFromPath('/cn/docs/concepts/enum')).toBe(
      '/cn/docs/concepts/enum',
    )
  })
})

describe('buildSearchIndex', () => {
  const rawPages = [
    { filePath: 'en/docs/concepts/enum.md', markdown: ENUM_MD },
    {
      filePath: 'en/docs/concepts/string.md',
      markdown: '# String\n\nEn only page.',
    },
    { filePath: 'en/blog/post.md', markdown: '# Post\n\nBlog body.' },
    { filePath: 'cn/docs/concepts/enum.md', markdown: '# 枚举\n\n中文内容。' },
  ]

  it('builds contract-shaped entries for own pages', () => {
    const index = buildSearchIndex(rawPages, nav)
    const en = index.en.find((e) => e.path === '/en/docs/concepts/enum')
    expect(en).toMatchObject({
      href: '/docs/concepts/enum',
      title: 'Enum',
      description: 'Map Rust enums to JS.',
      section: 'docs',
      group: 'Concepts',
    })
    expect(en.headings).toEqual([
      { depth: 2, slug: 'string-enum', text: 'String enum' },
    ])
    expect(en.body).toContain('pub enum Kind { Duck }')
    // no description key when frontmatter has none
    const str = index.en.find((e) => e.path === '/en/docs/concepts/string')
    expect(str).not.toHaveProperty('description')
  })

  it('mirrors en pages into locales missing the leaf (EN content, localized path/href)', () => {
    const index = buildSearchIndex(rawPages, nav)
    const mirrored = index.cn.find((e) => e.path === '/cn/docs/concepts/string')
    expect(mirrored).toMatchObject({
      href: '/cn/docs/concepts/string',
      title: 'String',
      body: 'String En only page.',
      group: '概念',
    })
    // localized page wins over the mirror
    const own = index.cn.filter((e) => e.path === '/cn/docs/concepts/enum')
    expect(own).toHaveLength(1)
    expect(own[0].title).toBe('枚举')
    // blog leaves mirror too
    expect(index.cn.some((e) => e.path === '/cn/blog/post')).toBe(true)
  })

  it('caps the body at BODY_LIMIT', () => {
    const huge = [
      {
        filePath: 'en/docs/big.md',
        markdown: `# Big\n\n${'x'.repeat(BODY_LIMIT + 500)}`,
      },
    ]
    const index = buildSearchIndex(huge, nav)
    expect(index.en[0].body.length).toBeLessThanOrEqual(BODY_LIMIT)
  })
})
