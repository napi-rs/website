// lib/support-matrix/node.ts
// Derives the Node.js support card from a package's `engines.node` range. Uses
// a deliberately tiny in-repo semver-range reader (no npm semver dependency):
// it understands the handful of forms real engines fields use — `^maj.min`,
// `~maj.min`, `>=maj[.min]` / `>maj[.min]`, an upper bound in the same part
// (`>=22 <25`, `>=22 <=25`), hyphen ranges (`18 - 20`), bare `maj[.min]`, and
// `||` unions. Each `||`-part is reduced to a covered-major interval, and the
// union of those intervals drives the headline, pills, and excluded prose — so a
// bounded range (`>=22 <25`) covers exactly its majors instead of running to the
// latest. Never throws: unparseable input yields an empty, well-formed model so
// the image service can degrade instead of erroring.

// The current Node.js "latest" major — the ceiling an open-above range runs to.
export const NODE_LATEST = 26

export interface NodePill {
  major: number
  // `maj.min` when the major is entered above its `.0` (e.g. `^24.12`), else
  // null for a whole major (`>=25`).
  floor: string | null
  tested: boolean
}

export interface NodeModel {
  // e.g. `v22.20 → v26` — floor version to the ceiling major (just `vFLOOR`
  // when the floor and ceiling majors coincide, e.g. a lone `^18.12`).
  headline: string
  enginesRaw: string
  // Prose listing the gaps between floor and ceiling (fully-skipped majors and
  // partial `maj.0–maj.min-1` ranges), or null when the range is contiguous.
  excluded: string | null
  pills: NodePill[]
}

// One `||`-separated part reduced to major granularity: the contiguous majors
// `low..high` it covers, with `low` entered at `lowMinor` (0 = the whole major).
// A caret / bare version is a single major (`low === high`); `>=X` with no upper
// bound is open above (`high` is the latest ceiling); an upper bound or a hyphen
// range caps `high`.
interface Part {
  low: number
  lowMinor: number
  high: number
}

// A single comparator token: an optional operator, a major, and an optional
// minor. The regex is anchored at the start so leading junk (`junk22`) fails to
// parse instead of matching a version mid-string.
interface Comparator {
  op: '^' | '~' | '>=' | '>' | '<=' | '<' | ''
  major: number
  minor: number | undefined
}

const COMPARATOR_RE = /^(\^|~|>=|>|<=|<)?\s*v?(\d+)(?:\.(\d+))?/

function parseComparator(raw: string): Comparator | null {
  const m = COMPARATOR_RE.exec(raw.trim())
  if (!m) return null
  const major = Number.parseInt(m[2], 10)
  if (!Number.isInteger(major)) return null
  return {
    op: (m[1] as Comparator['op']) ?? '',
    major,
    minor: m[3] === undefined ? undefined : Number.parseInt(m[3], 10),
  }
}

// An upper comparator (`<U` / `<=U`) → the highest major it (partially) covers.
// `<25` / `<25.0` stop below 25 → 24; `<25.3` reaches into 25 → 25; `<=U` → U.
function ceilingMajor(upper: Comparator): number {
  if (upper.op === '<=') return upper.major
  // `<U`: only `<U.m` with m>0 reaches into major U; `<U` / `<U.0` stop at U-1.
  return upper.minor && upper.minor > 0 ? upper.major : upper.major - 1
}

// Reduce one `||`-part to its covered-major interval, or null when unparseable.
function parsePart(raw: string, latest: number): Part | null {
  const part = raw.trim()
  if (!part) return null

  // Hyphen range `A - B` (spaces around the dash): contiguous majors A..B,
  // entered at A's minor (both sides are bare versions, no operator).
  const hyphen = part.split(/\s+-\s+/)
  if (hyphen.length === 2) {
    const lo = parseComparator(hyphen[0])
    const hi = parseComparator(hyphen[1])
    if (!lo || !hi || lo.op || hi.op || hi.major < lo.major) return null
    return { low: lo.major, lowMinor: lo.minor ?? 0, high: hi.major }
  }

  // Otherwise one or two whitespace-separated comparators: a lower bound
  // (`>=`/`>`) optionally paired with an upper bound (`<`/`<=`), or a
  // self-contained pin (`^`/`~`/bare). Glue a comparator to its version first so
  // the space-after-operator spelling (`>= 22 < 25`, valid semver) tokenizes the
  // same as the tight form and still respects the upper bound.
  let pin: Comparator | null = null
  let lower: Comparator | null = null
  let upper: Comparator | null = null
  for (const token of part.replace(/([<>]=?)\s+/g, '$1').split(/\s+/)) {
    const c = parseComparator(token)
    if (!c) continue
    if (c.op === '<' || c.op === '<=') upper = c
    else if (c.op === '>=' || c.op === '>') lower = c
    else pin ??= c // `^` / `~` / bare `maj[.min]`
  }

  if (lower) {
    // `>=maj[.min]` open above, or capped by an upper bound in the same part.
    const high = upper ? ceilingMajor(upper) : latest
    if (high < lower.major) return null // e.g. `>=25 <20` — empty range.
    return { low: lower.major, lowMinor: lower.minor ?? 0, high }
  }
  if (pin) {
    // Caret/tilde/bare: a single major, entered at its minor (bare `maj` → 0).
    return { low: pin.major, lowMinor: pin.minor ?? 0, high: pin.major }
  }
  // Upper-only or nothing parseable — no floor to anchor a card.
  return null
}

function parseRange(engines: string, latest: number): Part[] {
  const parts: Part[] = []
  for (const seg of engines.split('||')) {
    const part = parsePart(seg, latest)
    if (part) parts.push(part)
  }
  return parts
}

// Lowest (major, minor) any part admits — the overall support floor.
function rangeFloor(parts: Part[]): { major: number; minor: number } {
  let best = { major: Infinity, minor: Infinity }
  for (const p of parts) {
    if (
      p.low < best.major ||
      (p.low === best.major && p.lowMinor < best.minor)
    ) {
      best = { major: p.low, minor: p.lowMinor }
    }
  }
  return best
}

// Highest covered major across all parts, never above `latest` (an open-above
// part contributes `latest`).
function rangeCeiling(parts: Part[], latest: number): number {
  let ceil = -Infinity
  for (const p of parts) ceil = Math.max(ceil, Math.min(p.high, latest))
  return ceil
}

// Does any part admit `major`, and from which minor? floorMinor 0 means the
// whole major is covered; `covered=false` means the major is fully excluded.
function coverage(
  parts: Part[],
  major: number,
): { covered: boolean; floorMinor: number } {
  let floorMinor = Infinity
  for (const p of parts) {
    if (major < p.low || major > p.high) continue
    floorMinor = Math.min(floorMinor, major === p.low ? p.lowMinor : 0)
  }
  return floorMinor === Infinity
    ? { covered: false, floorMinor: 0 }
    : { covered: true, floorMinor }
}

export function deriveNode(
  engines: string,
  nodeTested: number[],
  latest: number,
  // Majors to drop from the pills entirely — an EOL runtime the range still
  // permits (`>=25` admits 25 after its EOL). The engines string is rendered
  // verbatim, so this hides only the pill, not the contract.
  nodeOmit: number[] = [],
): NodeModel {
  const enginesRaw = (engines ?? '').trim()
  const parts = parseRange(enginesRaw, latest)
  const tested = new Set((nodeTested ?? []).filter((n) => Number.isInteger(n)))
  const omit = new Set((nodeOmit ?? []).filter((n) => Number.isInteger(n)))

  if (parts.length === 0) {
    return { headline: `v${latest}`, enginesRaw, excluded: null, pills: [] }
  }

  const floor = rangeFloor(parts)
  const ceiling = rangeCeiling(parts, latest)
  const left =
    floor.minor > 0 ? `v${floor.major}.${floor.minor}` : `v${floor.major}`

  const pills: NodePill[] = []
  const gaps: string[] = []
  for (let major = floor.major; major <= ceiling; major++) {
    // An explicitly omitted (e.g. EOL) major is dropped whole — before any
    // coverage/gap accounting — so it leaves no pill AND no `excluded` mention,
    // whether or not the range covered it. It simply vanishes from the card.
    if (omit.has(major)) continue
    const cov = coverage(parts, major)
    if (!cov.covered) {
      // Fully-excluded major — only listed above the floor major (nothing
      // below the floor is ever "excluded", it is simply out of scope).
      if (major > floor.major) gaps.push(String(major))
      continue
    }
    // A major entered above `.0` leaves a `maj.0–maj.min-1` gap (again, only
    // above the floor major — the floor major's below-floor minors are scope).
    if (major > floor.major && cov.floorMinor > 0) {
      gaps.push(`${major}.0–${major}.${cov.floorMinor - 1}`)
    }
    pills.push({
      major,
      floor: cov.floorMinor > 0 ? `${major}.${cov.floorMinor}` : null,
      tested: tested.has(major),
    })
  }

  // Span the headline across the SURVIVING pills, so an omitted floor or ceiling
  // never dangles (a `→ v26` with no v26 pill). With nothing omitted this is the
  // plain floor→ceiling span; with every major omitted it falls back to the range
  // floor. `enginesRaw` is rendered verbatim regardless, so the declared range is
  // never concealed.
  const lo = pills[0]
  const hi = pills[pills.length - 1]
  const headline = lo
    ? lo.major < hi.major
      ? `${lo.floor ? `v${lo.floor}` : `v${lo.major}`} → v${hi.major}`
      : lo.floor
        ? `v${lo.floor}`
        : `v${lo.major}`
    : left

  return {
    headline,
    enginesRaw,
    excluded: gaps.length ? gaps.join(', ') : null,
    pills,
  }
}
