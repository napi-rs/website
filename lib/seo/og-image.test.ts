// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { ogImageUrl } from './og-image.ts'

describe('ogImageUrl', () => {
  it('returns a per-page image for docs/blog', () => {
    expect(ogImageUrl('/docs/concepts/class')).toBe(
      'https://napi.rs/og/docs/concepts/class.png',
    )
    expect(ogImageUrl('/cn/docs/concepts/class')).toBe(
      'https://napi.rs/og/cn/docs/concepts/class.png',
    )
    expect(ogImageUrl('/blog/announce-v3')).toBe(
      'https://napi.rs/og/blog/announce-v3.png',
    )
  })
  it('falls back to the static image for home/changelog', () => {
    expect(ogImageUrl('/')).toBe('https://napi.rs/img/og-v2.png')
    expect(ogImageUrl('/changelog/napi')).toBe('https://napi.rs/img/og-v2.png')
  })
  it('normalises an explicit /en/ prefix to the unprefixed served path', () => {
    // The deploy prerenderer dispatches pages by their INTERNAL `/en/docs/…`
    // route (bypassing the edge `/en/*` redirect), so ogImageUrl can receive an
    // en-prefixed path. The generator writes en cards UNPREFIXED, so the URL
    // must NOT carry `en/` — `/og/en/…` is a PNG that is never generated (404).
    expect(ogImageUrl('/en/docs/concepts/class')).toBe(
      'https://napi.rs/og/docs/concepts/class.png',
    )
    expect(ogImageUrl('/en/blog/announce-v3')).toBe(
      'https://napi.rs/og/blog/announce-v3.png',
    )
    expect(ogImageUrl('/en/docs/concepts/class/')).toBe(
      'https://napi.rs/og/docs/concepts/class.png',
    )
  })
  it('keeps the cn/pt-BR prefix — those cards ARE generated per-locale', () => {
    expect(ogImageUrl('/pt-BR/docs/concepts/class')).toBe(
      'https://napi.rs/og/pt-BR/docs/concepts/class.png',
    )
    expect(ogImageUrl('/pt-BR/blog/announce-v3')).toBe(
      'https://napi.rs/og/pt-BR/blog/announce-v3.png',
    )
  })
})
