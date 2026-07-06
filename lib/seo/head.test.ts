// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildSeoHead } from './head.ts'

const base = {
  title: 'Class',
  description: 'Define classes',
  hasDescriptionMeta: true,
  isFallback: false,
  mdLink: '',
}

describe('buildSeoHead', () => {
  it('emits one self-canonical and og:url equal to it', () => {
    const out = buildSeoHead({ ...base, publicPath: '/docs/concepts/class' })
    expect(out).toContain(
      '<link rel="canonical" href="https://napi.rs/docs/concepts/class">',
    )
    expect(out).toContain(
      '<meta property="og:url" content="https://napi.rs/docs/concepts/class">',
    )
    expect(out.match(/rel="canonical"/g)!.length).toBe(1)
  })
  it('canonicalises an i18n-fallback page to the en URL', () => {
    const out = buildSeoHead({
      ...base,
      publicPath: '/cn/docs/deep-dive/release',
      isFallback: true,
    })
    expect(out).toContain(
      '<link rel="canonical" href="https://napi.rs/docs/deep-dive/release">',
    )
  })
  it('adds a <meta name=description> only when the page had none', () => {
    const withMeta = buildSeoHead({
      ...base,
      publicPath: '/docs/concepts/class',
    })
    expect(withMeta).not.toContain('<meta name="description"')
    const without = buildSeoHead({
      ...base,
      publicPath: '/docs/concepts/class',
      hasDescriptionMeta: false,
    })
    expect(without).toContain(
      '<meta name="description" content="Define classes">',
    )
  })
  it('includes hreflang for multi-locale pages and JSON-LD for docs', () => {
    const out = buildSeoHead({ ...base, publicPath: '/docs/concepts/class' })
    expect(out).toContain('rel="alternate" hreflang="zh-CN"')
    expect(out).toContain('application/ld+json')
  })
  it('emits per-page og:image + twitter card fields', () => {
    const out = buildSeoHead({ ...base, publicPath: '/docs/concepts/class' })
    expect(out).toContain(
      '<meta property="og:image" content="https://napi.rs/og/docs/concepts/class.png">',
    )
    expect(out).toContain(
      '<meta name="twitter:image" content="https://napi.rs/og/docs/concepts/class.png">',
    )
    expect(out).toContain('<meta name="twitter:title" content="Class">')
    expect(out).toContain(
      '<meta name="twitter:description" content="Define classes">',
    )
  })
  it('uses the en OG image for an i18n-fallback page (no localized PNG exists)', () => {
    const out = buildSeoHead({
      ...base,
      publicPath: '/cn/docs/cli/build',
      isFallback: true,
    })
    expect(out).toContain(
      '<meta property="og:image" content="https://napi.rs/og/docs/cli/build.png">',
    )
    expect(out).toContain(
      '<meta name="twitter:image" content="https://napi.rs/og/docs/cli/build.png">',
    )
    expect(out).not.toContain('/og/cn/docs/cli/build.png')
  })
  it('escapes " and < in title/description so they cannot break out of content="…"', () => {
    const out = buildSeoHead({
      ...base,
      publicPath: '/docs/concepts/class',
      title: 'Say "hi" <b>',
      description: 'Tom & "Jerry" <x>',
      hasDescriptionMeta: false,
    })
    expect(out).toContain(
      '<meta property="og:title" content="Say &quot;hi&quot; &lt;b&gt;">',
    )
    expect(out).toContain(
      '<meta name="twitter:title" content="Say &quot;hi&quot; &lt;b&gt;">',
    )
    expect(out).toContain(
      '<meta name="description" content="Tom &amp; &quot;Jerry&quot; &lt;x&gt;">',
    )
    expect(out).toContain(
      '<meta property="og:description" content="Tom &amp; &quot;Jerry&quot; &lt;x&gt;">',
    )
    // the raw (unescaped) forms never leak — no attribute breakout
    expect(out).not.toContain('"hi"')
    expect(out).not.toContain('<b>')
    expect(out).not.toContain('<x>')
  })
  it('keeps JSON-LD url + inLanguage in sync with the canonical on an i18n-fallback page', () => {
    const out = buildSeoHead({
      ...base,
      publicPath: '/cn/docs/deep-dive/release',
      isFallback: true,
    })
    const m = out.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    )!
    const ld = JSON.parse(m[1].replace(/\\u003c/g, '<'))
    const article = ld['@graph'].find(
      (n: { '@type': string }) => n['@type'] === 'TechArticle',
    )
    expect(article.url).toBe('https://napi.rs/docs/deep-dive/release')
    expect(article.inLanguage).toBe('en')
    expect(out).toContain(
      '<link rel="canonical" href="https://napi.rs/docs/deep-dive/release">',
    )
  })
})
