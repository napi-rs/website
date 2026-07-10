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
  }
  return { query, theme: parseTheme(get('theme')) }
}
