// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { hreflangLinks, hreflangAlternates } from './hreflang.ts'

const MAP = {
  '/': ['cn', 'en', 'pt-BR'],
  '/docs/concepts/class': ['cn', 'en'],
  '/docs/only-en': ['en'],
}

describe('hreflangAlternates', () => {
  it('returns ordered {hreflang,href} incl x-default, empty for single-locale', () => {
    const alts = hreflangAlternates('/docs/concepts/class', MAP)
    expect(alts).toEqual([
      { hreflang: 'en', href: 'https://napi.rs/docs/concepts/class' },
      { hreflang: 'zh-CN', href: 'https://napi.rs/cn/docs/concepts/class' },
      { hreflang: 'x-default', href: 'https://napi.rs/docs/concepts/class' },
    ])
    expect(hreflangAlternates('/docs/only-en', MAP)).toEqual([])
  })
})

describe('hreflangLinks', () => {
  it('emits reciprocal alternates in en,cn,pt-BR order plus x-default->en', () => {
    const out = hreflangLinks('/', MAP)
    expect(out).toContain(
      '<link rel="alternate" hreflang="en" href="https://napi.rs/">',
    )
    expect(out).toContain(
      '<link rel="alternate" hreflang="zh-CN" href="https://napi.rs/cn">',
    )
    expect(out).toContain(
      '<link rel="alternate" hreflang="pt-BR" href="https://napi.rs/pt-BR">',
    )
    expect(out).toContain(
      '<link rel="alternate" hreflang="x-default" href="https://napi.rs/">',
    )
    // en link comes before the cn link:
    expect(out.indexOf('hreflang="en"')).toBeLessThan(
      out.indexOf('hreflang="zh-CN"'),
    )
  })
  it('handles a two-locale docs page (cn served under /cn)', () => {
    const out = hreflangLinks('/cn/docs/concepts/class', MAP)
    expect(out).toContain('href="https://napi.rs/docs/concepts/class"')
    expect(out).toContain('href="https://napi.rs/cn/docs/concepts/class"')
    expect(out).not.toContain('pt-BR')
  })
  it('emits nothing for a single-locale route', () => {
    expect(hreflangLinks('/docs/only-en', MAP)).toBe('')
  })
})
