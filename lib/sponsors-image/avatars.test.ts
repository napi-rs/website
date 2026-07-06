// @vitest-environment node
// lib/sponsors-image/avatars.test.ts
import { describe, it, expect, vi } from 'vitest'
import {
  inlineSponsorAvatars,
  bytesToBase64,
  type ImageFetcher,
} from './avatars.ts'
import type { WashedSponsors } from '../landing/sponsors.ts'

function emptyTiers(): WashedSponsors {
  return { specialThanks: [], platinum: [], gold: [], sliver: [], backers: [] }
}
function pngResponse(bytes = new Uint8Array([1, 2, 3, 4])): Response {
  return new Response(bytes, {
    status: 200,
    headers: { 'content-type': 'image/png' },
  })
}

describe('bytesToBase64', () => {
  it('round-trips through atob', () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255])
    const b64 = bytesToBase64(bytes)
    const back = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    expect([...back]).toEqual([...bytes])
  })
})

describe('inlineSponsorAvatars', () => {
  it('replaces each img with a base64 data URI and preserves name/url', async () => {
    const sponsors: WashedSponsors = {
      ...emptyTiers(),
      platinum: [
        { name: 'A', img: 'https://x/a.png', url: 'https://github.com/a' },
      ],
    }
    const fetchImage: ImageFetcher = vi.fn(async () => pngResponse())
    const out = await inlineSponsorAvatars(sponsors, fetchImage)
    expect(out.platinum).toHaveLength(1)
    expect(out.platinum[0].img).toMatch(/^data:image\/png;base64,/)
    expect(out.platinum[0].name).toBe('A')
    expect(out.platinum[0].url).toBe('https://github.com/a')
  })

  it('drops sponsors whose avatar fails to fetch or is not a raster image', async () => {
    const sponsors: WashedSponsors = {
      ...emptyTiers(),
      gold: [
        { name: 'ok', img: 'https://x/ok.png', url: 'https://github.com/ok' },
        {
          name: 'notfound',
          img: 'https://x/404.png',
          url: 'https://github.com/nf',
        },
        { name: 'webp', img: 'https://x/w.webp', url: 'https://github.com/w' },
        { name: 'threw', img: 'https://x/boom', url: 'https://github.com/t' },
      ],
    }
    const fetchImage: ImageFetcher = async (url) => {
      if (url.includes('404')) return new Response('', { status: 404 })
      if (url.includes('.webp'))
        return new Response(new Uint8Array([1]), {
          status: 200,
          headers: { 'content-type': 'image/webp' },
        })
      if (url.includes('boom')) throw new Error('network')
      return pngResponse()
    }
    const out = await inlineSponsorAvatars(sponsors, fetchImage)
    expect(out.gold.map((s) => s.name)).toEqual(['ok'])
  })

  it('drops an avatar whose fetch hangs past the timeout', async () => {
    const sponsors: WashedSponsors = {
      ...emptyTiers(),
      platinum: [
        {
          name: 'slow',
          img: 'https://x/slow.png',
          url: 'https://github.com/s',
        },
      ],
    }
    const hanging: ImageFetcher = (_url, signal) =>
      new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })
    const out = await inlineSponsorAvatars(sponsors, hanging, 20)
    expect(out.platinum).toHaveLength(0)
  })

  it('requests a sized avatar from githubusercontent hosts', async () => {
    const sponsors: WashedSponsors = {
      ...emptyTiers(),
      backers: [
        {
          name: 'g',
          img: 'https://avatars.githubusercontent.com/u/1?v=4',
          url: 'https://github.com/g',
        },
      ],
    }
    const seen: string[] = []
    const fetchImage: ImageFetcher = async (url) => {
      seen.push(url)
      return pngResponse()
    }
    await inlineSponsorAvatars(sponsors, fetchImage)
    expect(seen[0]).toContain('s=120')
  })
})
