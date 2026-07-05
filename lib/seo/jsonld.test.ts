// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { jsonLdFor } from './jsonld.ts'

function parse(html: string) {
  const m = html.match(
    /<script type="application\/ld\+json">([\s\S]*)<\/script>/,
  )
  return m ? JSON.parse(m[1]) : null
}

describe('jsonLdFor', () => {
  it('home emits WebSite + Organization', () => {
    const g = parse(jsonLdFor('/', { title: 'NAPI-RS', description: 'D' }))[
      '@graph'
    ]
    const types = g.map((n: any) => n['@type'])
    expect(types).toContain('WebSite')
    expect(types).toContain('Organization')
    const org = g.find((n: any) => n['@type'] === 'Organization')
    expect(org.sameAs).toContain('https://github.com/napi-rs/napi-rs')
  })
  it('docs emits TechArticle + BreadcrumbList with absolute item URLs', () => {
    const g = parse(
      jsonLdFor('/docs/concepts/class', { title: 'Class', description: 'D' }),
    )['@graph']
    expect(g.some((n: any) => n['@type'] === 'TechArticle')).toBe(true)
    const bc = g.find((n: any) => n['@type'] === 'BreadcrumbList')
    expect(bc).toBeTruthy()
    for (const li of bc.itemListElement) {
      if (li.item) expect(li.item).toMatch(/^https:\/\/napi\.rs\//)
    }
  })
  it('blog emits BlogPosting; datePublished present only when known', () => {
    const withDate = parse(
      jsonLdFor('/blog/announce-v2', { title: 'V2', description: 'D' }),
    )['@graph'][0]
    expect(withDate['@type']).toBe('BlogPosting')
    expect(withDate.datePublished).toBe('2021-12-17')
  })
  it('changelog gets no JSON-LD', () => {
    expect(
      jsonLdFor('/changelog/napi', { title: 'napi', description: 'D' }),
    ).toBe('')
  })
})
