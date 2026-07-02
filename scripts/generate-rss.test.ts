// @vitest-environment node
//
// Pure unit tests for scripts/generate-rss.mjs — no filesystem access; the
// exported helpers are driven directly. Covers the two tricky bits: frontmatter
// that follows a byte-0 `<script>` island block, and the blockquote-summary
// cleanup (markdown links flattened, lead emoji dropped).
import { describe, it, expect } from 'vitest'
import { parsePost, renderFeed, toPubDate } from './generate-rss.mjs'

describe('parsePost', () => {
  it('reads frontmatter after a leading <script> island block + cleans the blockquote summary', () => {
    const raw = [
      '<script>',
      'import Diff from "../../../components/v2-diff.jsx" with { island: "visible" }',
      '</script>',
      '',
      '---',
      "title: 'Announcing NAPI-RS v2'",
      "date: '2021-12-17'",
      '---',
      '',
      '# Announcing NAPI-RS v2',
      '',
      '> 🦀 NAPI-RS v2 - [Faster 🚀](https://example.com) , Easier to use.',
      '>',
      '> 📅 2021/12/17',
      '',
      'We are proudly announcing…',
    ].join('\n')
    const { frontmatter, summary } = parsePost(raw)
    expect(frontmatter.title).toBe('Announcing NAPI-RS v2')
    expect(frontmatter.date).toBe('2021-12-17')
    // [Faster 🚀](url) -> "Faster 🚀"; lead 🦀 dropped; inner 🚀 kept.
    expect(summary).toBe('NAPI-RS v2 - Faster 🚀 , Easier to use.')
  })

  it('reads frontmatter-first posts and yields no summary when there is no blockquote', () => {
    const raw = [
      '---',
      "title: 'Functions and Callbacks in NAPI-RS'",
      "date: '2025-08-10'",
      '---',
      '',
      '# Functions and Callbacks in NAPI-RS',
      '',
      "Callbacks are the heartbeat of JavaScript's ecosystem.",
    ].join('\n')
    const { frontmatter, summary } = parsePost(raw)
    expect(frontmatter.title).toBe('Functions and Callbacks in NAPI-RS')
    expect(frontmatter.date).toBe('2025-08-10')
    expect(summary).toBe('')
  })
})

describe('toPubDate', () => {
  it('formats an ISO date as a fixed UTC RFC-822 string (deterministic)', () => {
    expect(toPubDate('2025-07-07')).toBe('Mon, 07 Jul 2025 00:00:00 GMT')
    expect(toPubDate('2021-12-17')).toBe('Fri, 17 Dec 2021 00:00:00 GMT')
  })
})

describe('renderFeed', () => {
  it('renders RSS 2.0 with a description only when the item has a summary', () => {
    const xml = renderFeed([
      {
        title: 'With Summary',
        link: '/blog/a',
        date: '2025-07-07',
        summary: 'A & B <c>',
      },
      { title: 'No Summary', link: '/blog/b', date: '2021-12-17', summary: '' },
    ])
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('<title>NAPI-RS Blog</title>')
    // newest item's pubDate drives lastBuildDate
    expect(xml).toContain(
      '<lastBuildDate>Mon, 07 Jul 2025 00:00:00 GMT</lastBuildDate>',
    )
    expect(xml).toContain(
      '<guid isPermaLink="true">https://napi.rs/blog/a</guid>',
    )
    // text is XML-escaped
    expect(xml).toContain('<description>A &amp; B &lt;c&gt;</description>')
    // the summary-less item emits a title-only <item> (no <description>)
    const noSummaryItem = xml.slice(xml.indexOf('<title>No Summary</title>'))
    expect(noSummaryItem).not.toContain('<description>')
  })
})
