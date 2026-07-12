// lib/support-matrix/query.ts
// Parses a support-matrix badge request's query string into the pure
// `MatrixQuery` that `resolveMatrix` consumes, plus the light/dark theme.
// Split out of the two route files (svg/png) so both share ONE parser and it
// stays plain-vitest testable without a Hono/worker context. `resolveMatrix`
// also normalizes its input defensively, so the comma-splitting here is
// belt-and-suspenders — its real value is giving the routes a single, typed,
// unit-tested place where the raw URL params become the resolver's shape.

import { parseTheme, type Theme } from '../sponsors-image/theme.ts'
import type { MatrixQuery } from './resolve.ts'

// Reads a single query value — `c.req.query` in the routes, a closure over
// URLSearchParams in tests. Returns the first value, or undefined when absent.
export type QueryGetter = (key: string) => string | undefined

export interface ParsedSupportMatrixQuery {
  query: MatrixQuery
  theme: Theme
}

// Comma-split a raw param into trimmed, non-empty tokens. Absent (undefined) →
// undefined, so the `MatrixQuery` key stays unset rather than an empty array.
function splitList(raw: string | undefined): string[] | undefined {
  if (raw == null) return undefined
  const out: string[] = []
  for (const piece of raw.split(',')) {
    const token = piece.trim()
    if (token) out.push(token)
  }
  return out
}

// Comma-split → integers; non-numeric tokens are dropped (never throws). Absent
// → undefined. The resolver applies the final sanity range on these numbers.
function parseNodeTested(raw: string | undefined): number[] | undefined {
  const list = splitList(raw)
  if (list === undefined) return undefined
  const out: number[] = []
  for (const token of list) {
    // Require the whole token to be digits — bare `parseInt` would turn a
    // mistyped `22garbage` into 22 and paint Node 22 as CI-tested. This is the
    // first parser on the route path, so the guard must live here (the resolver
    // only sees already-parsed numbers).
    if (!/^\d+$/.test(token)) continue
    const n = Number.parseInt(token, 10)
    if (Number.isInteger(n)) out.push(n)
  }
  return out
}

export function parseSupportMatrixQuery(
  get: QueryGetter,
): ParsedSupportMatrixQuery {
  const query: MatrixQuery = {
    tested: splitList(get('tested')),
    nonblocking: splitList(get('nonblocking')),
    untested: splitList(get('untested')),
    omit: splitList(get('omit')),
    // Truthiness only — `resolveMatrix` treats '', '0', 'false'… as off, and
    // the Browser section also auto-appears when a wasm32-wasi* triple survives.
    wasm: get('wasm'),
    name: get('name'),
    // Raw semver range — `resolveMatrix`/`deriveNode` parse it.
    engines: get('engines'),
    nodeTested: parseNodeTested(get('nodeTested')),
    // Node majors to drop from the pills even though `engines` permits them
    // (an EOL runtime) — same integer-only parsing as nodeTested.
    nodeOmit: parseNodeTested(get('nodeOmit')),
  }
  return { query, theme: parseTheme(get('theme')) }
}

// ---------------------------------------------------------------------------
// The inverse: build the query string from an already-classified form state.
// This is what the /support-matrix URL-builder page emits so a maintainer never
// hand-writes the long self-contained URL. It is a PURE string builder (no
// renderer / satori / wasm) and the exact inverse of `parseSupportMatrixQuery`:
// re-parsing its output reproduces the parsed shape (see query.test.ts). Tier
// triples are emitted VERBATIM — alias spellings (`wasm32-wasi-preview1-threads`,
// `arm-linux-androideabi`) survive the round-trip; `resolveMatrix` normalizes
// them later at render time.

// Form state → query. Tier lists are comma-joined triples where the tested list
// may carry the literal `full` token; `theme` is only emitted when dark (light
// is the parser's default, so omitting it keeps the URL short + round-trips).
export interface SupportMatrixQueryInput {
  tested?: string[]
  nonblocking?: string[]
  untested?: string[]
  omit?: string[]
  // Forces the Browser card even without a wasm32-wasi* triple.
  wasm?: boolean
  // Cosmetic package name.
  name?: string
  // Raw semver range string, e.g. `^22.20 || ^24.12 || >=25`.
  engines?: string
  // Node majors marked tested (deduped/filtered to finite integers).
  nodeTested?: number[]
  // Node majors to DROP from the pills — an EOL runtime the range still permits.
  nodeOmit?: number[]
  theme?: Theme
}

// Trim, drop empties, comma-join — or undefined when nothing survives, so the
// param is omitted rather than emitted blank.
function joinList(list: string[] | undefined): string | undefined {
  if (!list) return undefined
  const cleaned: string[] = []
  for (const item of list) {
    const token = item.trim()
    if (token) cleaned.push(token)
  }
  return cleaned.length ? cleaned.join(',') : undefined
}

export function buildSupportMatrixQuery(
  input: SupportMatrixQueryInput,
): string {
  const params = new URLSearchParams()

  // Order mirrors the worked lzma example so the emitted URL reads the same.
  const tested = joinList(input.tested)
  if (tested) params.append('tested', tested)
  const nonblocking = joinList(input.nonblocking)
  if (nonblocking) params.append('nonblocking', nonblocking)
  const untested = joinList(input.untested)
  if (untested) params.append('untested', untested)
  const omit = joinList(input.omit)
  if (omit) params.append('omit', omit)

  // Truthy flag — the parser stores the raw string, the resolver treats it as on.
  if (input.wasm) params.append('wasm', '1')

  const engines = input.engines?.trim()
  if (engines) params.append('engines', engines)

  if (input.nodeTested && input.nodeTested.length) {
    const majors = input.nodeTested.filter((n) => Number.isInteger(n))
    if (majors.length) params.append('nodeTested', majors.join(','))
  }

  if (input.nodeOmit && input.nodeOmit.length) {
    const majors = input.nodeOmit.filter((n) => Number.isInteger(n))
    if (majors.length) params.append('nodeOmit', majors.join(','))
  }

  const name = input.name?.trim()
  if (name) params.append('name', name)

  // light is the parser's default; only dark needs to be spelled out.
  if (input.theme === 'dark') params.append('theme', 'dark')

  return params.toString()
}
