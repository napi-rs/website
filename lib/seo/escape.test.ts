// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { escapeAttr, htmlDecode } from './escape.ts'

describe('htmlDecode', () => {
  it('reverses the four entities Void/escapeAttr emit', () => {
    expect(htmlDecode('A &amp; B &lt;x&gt; &quot;q&quot;')).toBe(
      'A & B <x> "q"',
    )
  })

  it('does not over-decode a double-encoded entity (&amp; last)', () => {
    // `&amp;lt;` is the literal text `&lt;` once — NOT `<`.
    expect(htmlDecode('A &amp;lt; B')).toBe('A &lt; B')
    expect(htmlDecode('A &amp;amp; B')).toBe('A &amp; B')
  })

  it('leaves an apostrophe untouched (Void escapeHtml never encodes it)', () => {
    expect(htmlDecode("it's")).toBe("it's")
  })

  const samples = ['Plain', 'A & B', '"q"', '<x>', 'a & "b" < c']

  it('round-trips: htmlDecode(escapeAttr(s)) === s', () => {
    for (const s of samples) {
      expect(htmlDecode(escapeAttr(s))).toBe(s)
    }
  })

  it('invariant proving no double-encoding: decode-then-re-escape stays single', () => {
    // Void encodes once (escapeAttr). The middleware decodes once (htmlDecode),
    // then buildSeoHead escapes once (escapeAttr). The net result MUST equal a
    // single escapeAttr — never a double-encoded `&amp;amp;`.
    for (const s of samples) {
      expect(escapeAttr(htmlDecode(escapeAttr(s)))).toBe(escapeAttr(s))
    }
  })
})
