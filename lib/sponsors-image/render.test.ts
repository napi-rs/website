// @vitest-environment node
// lib/sponsors-image/render.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderSponsorsImage } from './render.ts'
import { ensureYoga, MAX_BACKERS } from './card.ts'
import { ensureResvg } from './resvg.ts'
import type { SatoriFont } from './fonts.ts'
import type { ImageFetcher } from './avatars.ts'
import type { WashedSponsors } from '../landing/sponsors.ts'

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
// a real 1x1 png so resvg can decode the embedded <image>
const onePngBytes = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
)
const fetchImage: ImageFetcher = async () =>
  new Response(onePngBytes, {
    status: 200,
    headers: { 'content-type': 'image/png' },
  })

function fonts(): SatoriFont[] {
  const bold = readFileSync('public/fonts/Manrope_700Bold.ttf')
  const medium = readFileSync('public/fonts/Manrope_500Medium.ttf')
  const toAB = (b: Buffer): ArrayBuffer =>
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
  return [
    { name: 'Manrope', data: toAB(bold), weight: 700, style: 'normal' },
    { name: 'Manrope', data: toAB(medium), weight: 500, style: 'normal' },
  ]
}
const sponsors: WashedSponsors = {
  specialThanks: [],
  platinum: [
    { name: 'A', img: 'https://x/a.png', url: 'https://github.com/a' },
  ],
  gold: [],
  sliver: [],
  backers: [],
}

beforeAll(async () => {
  await ensureYoga(
    new WebAssembly.Module(readFileSync('node_modules/satori/yoga.wasm')),
  )
  await ensureResvg(
    new WebAssembly.Module(
      readFileSync('node_modules/@resvg/resvg-wasm/index_bg.wasm'),
    ),
  )
})

describe('renderSponsorsImage', () => {
  it('returns an svg body + content-type for format=svg', async () => {
    const out = await renderSponsorsImage({
      format: 'svg',
      theme: 'light',
      sponsors,
      fonts: fonts(),
      fetchImage,
    })
    expect(typeof out.body).toBe('string')
    expect((out.body as string).startsWith('<svg')).toBe(true)
    expect(out.contentType).toBe('image/svg+xml; charset=utf-8')
  })

  it('caps backer avatar fetches at MAX_BACKERS', async () => {
    const many = Array.from({ length: MAX_BACKERS + 50 }, (_v, i) => ({
      name: `b${i}`,
      img: `https://x/${i}.png`,
      url: `https://github.com/b${i}`,
    }))
    const manySponsors: WashedSponsors = {
      specialThanks: [],
      platinum: [],
      gold: [],
      sliver: [],
      backers: many,
    }
    let calls = 0
    const counting: ImageFetcher = async () => {
      calls += 1
      return new Response(onePngBytes, {
        status: 200,
        headers: { 'content-type': 'image/png' },
      })
    }
    await renderSponsorsImage({
      format: 'svg',
      theme: 'light',
      sponsors: manySponsors,
      fonts: fonts(),
      fetchImage: counting,
    })
    expect(calls).toBe(MAX_BACKERS)
  })

  it('returns png bytes + content-type for format=png', async () => {
    const out = await renderSponsorsImage({
      format: 'png',
      theme: 'dark',
      sponsors,
      fonts: fonts(),
      fetchImage,
    })
    expect(out.body).toBeInstanceOf(Uint8Array)
    expect([...(out.body as Uint8Array).slice(0, 8)]).toEqual(PNG_MAGIC)
    expect(out.contentType).toBe('image/png')
  })
})
