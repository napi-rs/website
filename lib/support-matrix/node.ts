// lib/support-matrix/node.ts
// Derives the Node.js support card from a package's `engines.node` range. Uses
// a deliberately tiny in-repo semver-range reader (no npm semver dependency):
// it understands the handful of forms real engines fields use — `^maj.min`,
// `^maj`, `>=maj[.min]`, bare `maj[.min]`, and `||` unions — which is all this
// card needs. Never throws: unparseable input yields an empty, well-formed
// model so the image service can degrade instead of erroring.

// The current Node.js "latest" major — the ceiling every headline runs up to.
export const NODE_LATEST = 26

export interface NodePill {
  major: number
  // `maj.min` when the major is entered above its `.0` (e.g. `^24.12`), else
  // null for a whole major (`>=25`).
  floor: string | null
  tested: boolean
}

export interface NodeModel {
  // e.g. `v22.20 → v26` — floor version to the latest major.
  headline: string
  enginesRaw: string
  // Prose listing the gaps between floor and ceiling (fully-skipped majors and
  // partial `maj.0–maj.min-1` ranges), or null when the range is contiguous.
  excluded: string | null
  pills: NodePill[]
}

// One parsed clause of an engines range.
type Clause =
  // `^maj.min` / `^maj` / bare `maj.min`: covers ONLY `major`, from `minor` up.
  | { kind: 'caret'; major: number; minor: number }
  // `>=maj[.min]`: covers `major` from `minor`, and every higher major fully.
  | { kind: 'gte'; major: number; minor: number }
  // bare `maj`: covers ONLY `major`, fully.
  | { kind: 'exact'; major: number }

// Grab the first version-ish token in a clause; a trailing `<` upper bound (as
// in `>=22 <25`) is ignored — a floor-only reader is enough for this card.
const CLAUSE_RE = /(\^|~|>=|>)?\s*v?(\d+)(?:\.(\d+))?/

function parseClause(raw: string): Clause | null {
  const m = CLAUSE_RE.exec(raw.trim())
  if (!m) return null
  const op = m[1]
  const major = Number.parseInt(m[2], 10)
  const minor = m[3] === undefined ? undefined : Number.parseInt(m[3], 10)
  if (!Number.isInteger(major)) return null
  if (op === '^' || op === '~') {
    return { kind: 'caret', major, minor: minor ?? 0 }
  }
  if (op === '>=' || op === '>') {
    return { kind: 'gte', major, minor: minor ?? 0 }
  }
  // no operator: bare `maj.min` behaves like a caret (enter the major at that
  // minor); bare `maj` is that whole major only.
  return minor === undefined
    ? { kind: 'exact', major }
    : { kind: 'caret', major, minor }
}

function parseRange(engines: string): Clause[] {
  const clauses: Clause[] = []
  for (const part of engines.split('||')) {
    const clause = parseClause(part)
    if (clause) clauses.push(clause)
  }
  return clauses
}

// Lowest (major, minor) any clause admits — the overall support floor.
function rangeFloor(clauses: Clause[]): { major: number; minor: number } {
  let best = { major: Infinity, minor: Infinity }
  for (const c of clauses) {
    const minor = c.kind === 'exact' ? 0 : c.minor
    if (
      c.major < best.major ||
      (c.major === best.major && minor < best.minor)
    ) {
      best = { major: c.major, minor }
    }
  }
  return best
}

// Does any clause admit `major`, and from which minor? floorMinor 0 means the
// whole major is covered; `covered=false` means the major is fully excluded.
function coverage(
  clauses: Clause[],
  major: number,
): { covered: boolean; floorMinor: number } {
  let floorMinor = Infinity
  for (const c of clauses) {
    if (c.kind === 'caret' && c.major === major) {
      floorMinor = Math.min(floorMinor, c.minor)
    } else if (c.kind === 'exact' && c.major === major) {
      floorMinor = 0
    } else if (c.kind === 'gte') {
      if (major > c.major) floorMinor = 0
      else if (major === c.major) floorMinor = Math.min(floorMinor, c.minor)
    }
  }
  return floorMinor === Infinity
    ? { covered: false, floorMinor: 0 }
    : { covered: true, floorMinor }
}

export function deriveNode(
  engines: string,
  nodeTested: number[],
  latest: number,
): NodeModel {
  const enginesRaw = (engines ?? '').trim()
  const clauses = parseRange(enginesRaw)
  const tested = new Set((nodeTested ?? []).filter((n) => Number.isInteger(n)))

  if (clauses.length === 0) {
    return { headline: `v${latest}`, enginesRaw, excluded: null, pills: [] }
  }

  const floor = rangeFloor(clauses)
  const left =
    floor.minor > 0 ? `v${floor.major}.${floor.minor}` : `v${floor.major}`
  const headline = floor.major < latest ? `${left} → v${latest}` : left

  const pills: NodePill[] = []
  const gaps: string[] = []
  for (let major = floor.major; major <= latest; major++) {
    const cov = coverage(clauses, major)
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

  return {
    headline,
    enginesRaw,
    excluded: gaps.length ? gaps.join(', ') : null,
    pills,
  }
}
