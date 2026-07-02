import { describe, expect, it } from 'vitest'
import { negotiate } from './accept.ts'

describe('negotiate() — markdown vs HTML content negotiation', () => {
  describe('browsers / default clients get HTML (prefersMarkdown === false)', () => {
    const htmlCases: [name: string, accept: string | null | undefined][] = [
      ['no Accept header (undefined)', undefined],
      ['no Accept header (null)', null],
      ['empty Accept header', '   '],
      ['curl default */*', '*/*'],
      [
        'Chrome/Firefox document navigation',
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      ],
      ['plain text/html', 'text/html'],
      ['text/* wildcard (ambiguous → HTML default)', 'text/*'],
      [
        'equal-weight html then markdown (html listed first)',
        'text/html, text/markdown',
      ],
      [
        'markdown present but lower q than html',
        'text/html, text/markdown;q=0.5',
      ],
      [
        'markdown only via */* while html is explicit',
        'text/html;q=0.9, */*;q=0.8',
      ],
      [
        'client accepts only json (neither md nor html preferred)',
        'application/json',
      ],
    ]
    it.each(htmlCases)('%s', (_name, accept) => {
      expect(negotiate(accept).prefersMarkdown).toBe(false)
    })
  })

  describe('agents that prefer markdown (prefersMarkdown === true)', () => {
    const mdCases: [name: string, accept: string][] = [
      ['bare text/markdown', 'text/markdown'],
      ['text/markdown with charset', 'text/markdown; charset=utf-8'],
      ['markdown higher q than html', 'text/markdown, text/html;q=0.9'],
      ['markdown explicit, html only via */*', 'text/markdown, */*;q=0.1'],
      [
        'equal-weight markdown then html (markdown listed first → order tiebreak)',
        'text/markdown, text/html',
      ],
      [
        'html explicitly refused, markdown wanted',
        'text/markdown, text/html;q=0',
      ],
      ['whitespace / mixed case', '  TEXT/Markdown ;Q=1.0 , text/html;q=0.4 '],
    ]
    it.each(mdCases)('%s', (_name, accept) => {
      expect(negotiate(accept).prefersMarkdown).toBe(true)
    })
  })

  describe('acceptsHtml — whether HTML is an acceptable fallback', () => {
    it('is true when html has positive q', () => {
      expect(negotiate('text/markdown, text/html;q=0.9').acceptsHtml).toBe(true)
      expect(negotiate('*/*').acceptsHtml).toBe(true)
      expect(negotiate('text/html').acceptsHtml).toBe(true)
      expect(negotiate(undefined).acceptsHtml).toBe(true)
    })
    it('is false when the client accepts markdown but not html', () => {
      // These are the ONLY cases that should yield a 406 on a route lacking .md.
      expect(negotiate('text/markdown').acceptsHtml).toBe(false)
      expect(negotiate('text/markdown, text/html;q=0').acceptsHtml).toBe(false)
    })
  })

  describe('q=0 means "not acceptable"', () => {
    it('markdown with q=0 never wins', () => {
      expect(
        negotiate('text/markdown;q=0, text/html;q=0.1').prefersMarkdown,
      ).toBe(false)
    })
  })
})
