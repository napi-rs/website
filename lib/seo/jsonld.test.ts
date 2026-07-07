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
    // Every non-last crumb MUST carry an absolute `item` URL — including the
    // middle "group" crumb, which renders as plain text but still needs an
    // `item` or Google flags "missing field item (in itemListElement)".
    bc.itemListElement.forEach((li: any, i: number) => {
      if (i < bc.itemListElement.length - 1) {
        expect(li.item, `crumb ${i} "${li.name}" needs item`).toMatch(
          /^https:\/\/napi\.rs\//,
        )
      }
    })
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
  it('escapes </script> in the title so the JSON-LD block cannot close early', () => {
    const out = jsonLdFor('/docs/x', {
      title: 'x</script><script>alert(1)</script>',
      description: 'd',
    })
    // the title's </script> is escaped to </script>, never a literal tag
    expect(out).not.toContain('</script><script>')
    // exactly one real closing tag — the JSON-LD block's own
    expect(out.match(/<\/script>/g)!.length).toBe(1)
    // ...and it still round-trips: strip the wrapper and JSON.parse (JSON parses
    // the < escapes back to `<` natively)
    const json = out
      .replace(/^<script type="application\/ld\+json">/, '')
      .replace(/<\/script>$/, '')
    const ld = JSON.parse(json)
    const article = ld['@graph'].find((n: any) => n['@type'] === 'TechArticle')
    expect(article.headline).toBe('x</script><script>alert(1)</script>')
  })
})
