// @vitest-environment node
//
// Verifies the build-time OG image generator renders a real PNG. satori turns a
// React node into SVG; @resvg/resvg-js rasterises it — this drives BOTH end to
// end (a stub would not carry the PNG magic bytes) with a docs-style title.
import { describe, it, expect } from 'vitest'
import { renderOg } from './generate-og-images.mjs'

describe('renderOg', () => {
  it('renders a PNG buffer for a title', async () => {
    const png = await renderOg('Getting started')
    // PNG magic number: 89 50 4E 47
    expect(png.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    expect(png.length).toBeGreaterThan(1000)
  })
})
