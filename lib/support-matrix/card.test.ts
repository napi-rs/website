// @vitest-environment node
// lib/support-matrix/card.test.ts
// Renders MatrixModels to SVG through satori and asserts the output is a
// self-contained, tier-colored badge. satori vectorizes the Manrope fonts into
// <path> geometry (embedFont default), so there are NO <text> nodes and chip
// labels do not appear as literal strings — the string snapshot is the per-label
// regression guard, while explicit assertions cover the structural invariants
// (self-contained, three tier colors, one status icon per rendered card).
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderSvg, CARD_WIDTH } from './card.ts'
import { palette } from './theme.ts'
import type { SatoriFont } from '../sponsors-image/fonts.ts'
import { resolveMatrix, type MatrixModel } from './resolve.ts'

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

const yoga = new WebAssembly.Module(
  readFileSync('node_modules/satori/yoga.wasm'),
)

// The spec's worked example — full scaffold with two non-blocking Linux
// targets, four downgraded-to-untested targets (incl. wasm → Browser), and a
// derived Node card.
function lzmaModel(): MatrixModel {
  return resolveMatrix({
    name: '@napi-rs/lzma',
    tested: 'full',
    nonblocking: 'powerpc64le-unknown-linux-gnu,s390x-unknown-linux-gnu',
    untested:
      'riscv64gc-unknown-linux-gnu,aarch64-linux-android,arm-linux-androideabi,wasm32-wasi-preview1-threads',
    engines: '^22.20 || ^24.12 || >=25',
    nodeTested: '22,24',
  })
}
// The whole scaffold, all tested — no Node card, green Browser card.
function fullModel(): MatrixModel {
  return resolveMatrix({ tested: 'full' })
}
// A single native target — exercises the "only render cards with content" path
// (no Node card, no Browser card, one OS row).
function minimalModel(): MatrixModel {
  return resolveMatrix({ tested: 'x86_64-apple-darwin' })
}

function render(model: MatrixModel, theme: 'light' | 'dark'): Promise<string> {
  return renderSvg(model, { theme, fonts: fonts(), yogaWasm: yoga })
}

function count(svg: string, re: RegExp): number {
  return (svg.match(re) ?? []).length
}

// Count the icons satori embeds as data-URI <image> elements. Composition:
// one status check-circle per rendered card, plus one warn triangle when the
// Browser card is present. (satori re-encodes the icon SVGs as base64, so the
// icons are only countable by element, not by their inner shapes.)
function imageCount(svg: string): number {
  return count(svg, /<image /g)
}

// Drop the vectorized glyph geometry (`d="…"`, by far the bulk and the only
// part that churns on a satori/font patch bump) so the snapshot stays small,
// readable, and deterministic while still capturing element order, colors,
// dimensions, positions, and the data-URI icons. The full self-contained output
// (fonts as real <path>s) is verified by the structural assertions above.
function normalize(svg: string): string {
  return svg.replace(/ d="[^"]*"/g, ' d="~"')
}

beforeAll(async () => {
  await render(minimalModel(), 'light') // warm the yoga init once
})

describe('renderSvg — structural invariants', () => {
  for (const theme of ['light', 'dark'] as const) {
    it(`produces a self-contained, tier-colored SVG (${theme})`, async () => {
      const p = palette(theme)
      const svg = await render(lzmaModel(), theme)

      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg).toContain(`width="${CARD_WIDTH}"`)

      // Self-contained: fonts are vectorized to paths (no <text>), and it is
      // never a <table> — a plain, embeddable badge.
      expect(svg).not.toContain('<text')
      expect(svg).not.toContain('<table')

      // All three status-tier colors are present (green tested chips, amber
      // non-blocking chips, gray untested chips + the legend dots).
      expect(svg).toContain(p.tiers.tested.text)
      expect(svg).toContain(p.tiers.nonblocking.text)
      expect(svg).toContain(p.tiers.untested.text)

      // Node + Platforms + Browser cards (3 status icons) + the browser card's
      // warn triangle = 4 embedded icons.
      expect(imageCount(svg)).toBe(4)
    })
  }

  it('renders only the cards that have content', async () => {
    // full model: no engines → no Node card. Platforms + Browser status icons
    // + browser warn triangle = 3.
    expect(imageCount(await render(fullModel(), 'dark'))).toBe(3)
    // minimal model: no node, no browser → only the Platforms status icon.
    expect(imageCount(await render(minimalModel(), 'light'))).toBe(1)
  })

  it('never throws on an empty model and emits a bare panel', async () => {
    const svg = await render(resolveMatrix({}), 'dark')
    expect(svg.startsWith('<svg')).toBe(true)
    expect(imageCount(svg)).toBe(0)
  })
})

describe('renderSvg — snapshots', () => {
  const cases: Array<[string, () => MatrixModel]> = [
    ['lzma', lzmaModel],
    ['full', fullModel],
    ['minimal', minimalModel],
  ]
  for (const [name, make] of cases) {
    for (const theme of ['light', 'dark'] as const) {
      it(`${name} / ${theme} is stable`, async () => {
        const svg = await render(make(), theme)
        expect(normalize(svg)).toMatchSnapshot()
      })
    }
  }
})
