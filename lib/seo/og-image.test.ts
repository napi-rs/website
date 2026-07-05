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
})
