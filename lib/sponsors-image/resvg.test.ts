// @vitest-environment node
// lib/sponsors-image/resvg.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { ensureResvg, svgToPng } from './resvg.ts'

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

beforeAll(async () => {
  await ensureResvg(
    new WebAssembly.Module(
      readFileSync('node_modules/@resvg/resvg-wasm/index_bg.wasm'),
    ),
  )
})

describe('svgToPng', () => {
  it('rasterizes an svg to png bytes', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>'
    const png = svgToPng(svg, 20)
    expect([...png.slice(0, 8)]).toEqual(PNG_MAGIC)
    expect(png.length).toBeGreaterThan(50)
  })

  it('ensureResvg is idempotent (second call resolves)', async () => {
    await expect(
      ensureResvg(
        new WebAssembly.Module(
          readFileSync('node_modules/@resvg/resvg-wasm/index_bg.wasm'),
        ),
      ),
    ).resolves.toBeUndefined()
  })
})
