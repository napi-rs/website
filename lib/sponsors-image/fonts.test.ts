// @vitest-environment node
// lib/sponsors-image/fonts.test.ts
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { loadFonts, readAsset, type AssetReader } from './fonts.ts'

const bold = readFileSync('public/fonts/Manrope_700Bold.ttf')
const medium = readFileSync('public/fonts/Manrope_500Medium.ttf')

function bufferFor(path: string): ArrayBuffer {
  const buf = path.includes('700') ? bold : medium
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

describe('loadFonts', () => {
  // One shared mock across both tests: loadFonts is module-cached, so test 1
  // populates the cache (2 reads) and test 2 asserts the later loads are served
  // from that same cache (still 2 reads total, not 4). A per-test mock would see
  // 0 calls in test 2 because the cache is already warm from test 1.
  const read: AssetReader = vi.fn(async (p) => bufferFor(p))

  it('returns Manrope 700 + 500 descriptors', async () => {
    const fonts = await loadFonts(read)
    expect(fonts.map((f) => [f.name, f.weight, f.style])).toEqual([
      ['Manrope', 700, 'normal'],
      ['Manrope', 500, 'normal'],
    ])
    expect(fonts[0].data.byteLength).toBeGreaterThan(1000)
  })

  it('caches after the first successful load', async () => {
    await loadFonts(read)
    await loadFonts(read)
    // 2 reads total from test 1's populate; both loads here hit the cache.
    expect(read).toHaveBeenCalledTimes(2)
  })
})

describe('readAsset', () => {
  it('fetches path against baseUrl and returns arrayBuffer', async () => {
    const assets = {
      fetch: vi.fn(async (input: URL) => {
        expect(input.toString()).toBe('https://napi.rs/fonts/x.ttf')
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
      }),
    }
    const buf = await readAsset(
      assets,
      'https://napi.rs/sponsors.png',
      '/fonts/x.ttf',
    )
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('throws on a non-ok asset response', async () => {
    const assets = {
      fetch: vi.fn(async () => new Response('', { status: 404 })),
    }
    await expect(
      readAsset(assets, 'https://napi.rs/', '/fonts/missing.ttf'),
    ).rejects.toThrow()
  })
})
