// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildRouteMap, parseBlogDate } from './build-route-map.mjs'

describe('buildRouteMap', () => {
  it('groups public routes by neutral path into sorted locale lists', () => {
    const routes = [
      '/',
      '/cn',
      '/pt-BR',
      '/docs/concepts/class',
      '/cn/docs/concepts/class',
      '/blog/announce-v3',
    ]
    expect(buildRouteMap(routes)).toEqual({
      '/': ['cn', 'en', 'pt-BR'],
      '/docs/concepts/class': ['cn', 'en'],
      '/blog/announce-v3': ['en'],
    })
  })
})

describe('parseBlogDate', () => {
  it('reads a quoted date from frontmatter after a byte-0 script block', () => {
    const src = `<script>\nimport X from 'y'\n</script>\n\n---\ntitle: 'T'\ndate: '2025-07-07'\n---\n\n# T`
    expect(parseBlogDate(src)).toBe('2025-07-07')
  })
  it('returns null when there is no date', () => {
    expect(parseBlogDate('---\ntitle: T\n---\n# T')).toBeNull()
  })
})
