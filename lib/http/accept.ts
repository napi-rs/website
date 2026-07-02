// Pure, unit-testable HTTP `Accept`-header content negotiation for the
// "serve markdown to agents" feature (see middleware/00.accept-markdown.ts and
// https://acceptmarkdown.com/start).
//
// The convention is "one URL, two representations": an agent that asks for
// `text/markdown` ahead of `text/html` gets the raw markdown source; everyone
// else (browsers, crawlers, `curl` with `*/*`) gets HTML. The rule from the spec
// is "parse the header, sort by q-value, break ties by specificity" — NOT a
// substring test (a naive `accept.includes('markdown')` would mis-serve a
// browser whose `*/*` technically "includes" nothing of the sort, and would miss
// weighted headers entirely).
//
// This module has NO framework dependency so it can be unit tested without
// booting the worker (mirrors lib/i18n/fallback.ts).

/** The parsed priority of one concrete media type within an `Accept` header. */
interface Match {
  /** Quality factor 0..1 of the most specific matching range (0 = no match). */
  q: number
  /** Specificity of the range: 3 = exact `type/subtype`, 2 = `type/` wildcard, 1 = catch-all wildcard. */
  spec: number
  /** Index of that range in the header (earlier = higher priority on a tie). */
  pos: number
}

const NO_MATCH: Match = { q: 0, spec: 0, pos: Number.POSITIVE_INFINITY }

interface Range {
  type: string
  subtype: string
  q: number
  pos: number
}

/** Parse an `Accept` header into media ranges with q-values (bad tokens skipped). */
function parseRanges(accept: string): Range[] {
  const ranges: Range[] = []
  const tokens = accept.split(',')
  for (let pos = 0; pos < tokens.length; pos++) {
    const raw = tokens[pos].trim()
    if (!raw) continue
    const [mediaType, ...params] = raw.split(';').map((s) => s.trim())
    const slash = mediaType.indexOf('/')
    if (slash === -1) continue // malformed range like "text" — ignore
    const type = mediaType.slice(0, slash).toLowerCase()
    const subtype = mediaType.slice(slash + 1).toLowerCase()
    if (!type || !subtype) continue

    // Default q is 1; an explicit, well-formed `q=` param overrides it. A
    // malformed q leaves the default (lenient, matching real servers).
    let q = 1
    for (const p of params) {
      const eq = p.indexOf('=')
      if (eq === -1) continue
      if (p.slice(0, eq).trim().toLowerCase() !== 'q') continue
      const v = Number.parseFloat(p.slice(eq + 1).trim())
      if (Number.isFinite(v)) q = Math.min(1, Math.max(0, v))
    }
    ranges.push({ type, subtype, q, pos })
  }
  return ranges
}

/**
 * Best (most specific, then highest-q, then earliest) matching range for a
 * concrete `type/subtype`. Specificity ranks exact over a type wildcard over
 * the catch-all wildcard.
 */
function bestMatch(ranges: Range[], type: string, subtype: string): Match {
  let best: Match = NO_MATCH
  for (const r of ranges) {
    let spec = 0
    if (r.type === type && r.subtype === subtype) spec = 3
    else if (r.type === type && r.subtype === '*') spec = 2
    else if (r.type === '*' && r.subtype === '*') spec = 1
    if (spec === 0) continue
    // Prefer the more specific range; tie-break on higher q, then earlier pos.
    if (
      spec > best.spec ||
      (spec === best.spec && r.q > best.q) ||
      (spec === best.spec && r.q === best.q && r.pos < best.pos)
    ) {
      best = { q: r.q, spec, pos: r.pos }
    }
  }
  return best
}

/** Order two matches by descending priority: q, then specificity, then position. */
function rank(a: Match, b: Match): number {
  if (a.q !== b.q) return b.q - a.q
  if (a.spec !== b.spec) return b.spec - a.spec
  return a.pos - b.pos
}

export interface AcceptNegotiation {
  /**
   * True iff the client ranks `text/markdown` STRICTLY above `text/html`
   * (q, then specificity, then header order). A tie — including no `Accept`
   * header, a catch-all wildcard, or equal-weight `text/html, text/markdown` —
   * resolves to HTML, the site's default representation, so browsers are never
   * affected.
   */
  prefersMarkdown: boolean
  /** True iff the client accepts HTML at all (its effective q for HTML is > 0). */
  acceptsHtml: boolean
}

/**
 * Negotiate markdown-vs-HTML for one request's `Accept` header.
 *
 * @param accept  The raw `Accept` header value (null/undefined/empty allowed).
 */
export function negotiate(
  accept: string | null | undefined,
): AcceptNegotiation {
  // No header → RFC 7231: treat as `*/*`. Everything is acceptable and HTML,
  // the default representation, wins the tie.
  if (!accept || !accept.trim()) {
    return { prefersMarkdown: false, acceptsHtml: true }
  }
  const ranges = parseRanges(accept)
  const md = bestMatch(ranges, 'text', 'markdown')
  const html = bestMatch(ranges, 'text', 'html')
  return {
    prefersMarkdown: md.q > 0 && rank(md, html) < 0,
    acceptsHtml: html.q > 0,
  }
}
