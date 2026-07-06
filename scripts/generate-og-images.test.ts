// @vitest-environment node
//
// Verifies the build-time OG image generator renders a real PNG. satori turns a
// React node into SVG; @resvg/resvg-js rasterises it — this drives BOTH end to
// end (a stub would not carry the PNG magic bytes) with a docs-style title.
import { describe, it, expect } from 'vitest'
import { renderOg, frontmatterTitle } from './generate-og-images.mjs'

describe('renderOg', () => {
  it('renders a PNG buffer for a title', async () => {
    const png = await renderOg('Getting started')
    // PNG magic number: 89 50 4E 47
    expect(png.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    expect(png.length).toBeGreaterThan(1000)
  })
})

describe('frontmatterTitle', () => {
  it('reads title from the leading frontmatter, ignoring a body/code title:', () => {
    const src = [
      '---',
      'title: Real Title',
      'description: d',
      '---',
      '',
      '# Heading',
      '',
      '```yaml',
      'title: not the page title',
      '```',
    ].join('\n')
    expect(frontmatterTitle(src, 'fallback')).toBe('Real Title')
  })
  it('tolerates a byte-0 <script> island block before the frontmatter', () => {
    const src =
      '<script>\nconst x = 1\n</script>\n\n---\ntitle: Island Post\n---\nbody'
    expect(frontmatterTitle(src, 'fallback')).toBe('Island Post')
  })
  it('falls back to the route slug when the frontmatter has no title', () => {
    const src = '---\ndescription: d\n---\ntitle: in body only'
    expect(frontmatterTitle(src, 'docs/x')).toBe('docs/x')
  })
  it('strips the – NAPI-RS HTML-title suffix', () => {
    expect(frontmatterTitle('---\ntitle: Class – NAPI-RS\n---', 'f')).toBe(
      'Class',
    )
  })
})
