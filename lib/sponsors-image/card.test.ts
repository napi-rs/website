// @vitest-environment node
// lib/sponsors-image/card.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { ensureYoga, renderSvg, CARD_WIDTH } from './card.ts'
import type { SatoriFont } from './fonts.ts'
import type { WashedSponsors } from '../landing/sponsors.ts'

// 1x1 transparent PNG data URI — a valid inlined avatar for satori to embed.
const dot =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

function fonts(): SatoriFont[] {
  const bold = readFileSync('public/fonts/Manrope_700Bold.ttf')
  const medium = readFileSync('public/fonts/Manrope_500Medium.ttf')
  const toAB = (b: Buffer) =>
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
  return [
    { name: 'Manrope', data: toAB(bold), weight: 700, style: 'normal' },
    { name: 'Manrope', data: toAB(medium), weight: 500, style: 'normal' },
  ]
}
function empty(): WashedSponsors {
  return { specialThanks: [], platinum: [], gold: [], sliver: [], backers: [] }
}

beforeAll(async () => {
  await ensureYoga(
    new WebAssembly.Module(readFileSync('node_modules/satori/yoga.wasm')),
  )
})

describe('renderSvg', () => {
  it('renders an svg of the configured width containing one <image> per sponsor', async () => {
    const sponsors: WashedSponsors = {
      ...empty(),
      platinum: [{ name: 'A', img: dot, url: 'https://github.com/a' }],
      gold: [
        { name: 'B', img: dot, url: 'https://github.com/b' },
        { name: 'C', img: dot, url: 'https://github.com/c' },
      ],
    }
    const svg = await renderSvg(sponsors, 'light', fonts())
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain(`width="${CARD_WIDTH}"`)
    expect((svg.match(/<image/g) ?? []).length).toBe(3)
  })

  it('renders header-only svg (no <image>) when there are no sponsors', async () => {
    const svg = await renderSvg(empty(), 'dark', fonts())
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.includes('<image')).toBe(false)
  })
})
