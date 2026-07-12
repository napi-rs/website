// @vitest-environment node
// lib/support-matrix/node.test.ts
import { describe, it, expect } from 'vitest'
import { deriveNode, NODE_LATEST } from './node.ts'

describe('NODE_LATEST', () => {
  it('is the current node ceiling', () => {
    expect(NODE_LATEST).toBe(26)
  })
})

describe('deriveNode — spec worked example', () => {
  const model = deriveNode('^22.20 || ^24.12 || >=25', [22, 24], 26)

  it('keeps the raw engines string', () => {
    expect(model.enginesRaw).toBe('^22.20 || ^24.12 || >=25')
  })

  it('headline runs from the floor version to the latest major', () => {
    expect(model.headline).toBe('v22.20 → v26')
  })

  it('excluded prose names the fully-skipped major and the partial gap', () => {
    expect(model.excluded).not.toBeNull()
    expect(model.excluded).toContain('23')
    expect(model.excluded).toContain('24.0')
    expect(model.excluded).toContain('24.11')
    // below the floor (22.0–22.19) is out of scope, never mentioned
    expect(model.excluded).not.toContain('22.0')
  })

  it('emits one pill per (partially) satisfied major, floor per major', () => {
    expect(model.pills).toEqual([
      { major: 22, floor: '22.20', tested: true },
      { major: 24, floor: '24.12', tested: true },
      { major: 25, floor: null, tested: false },
      { major: 26, floor: null, tested: false },
    ])
  })

  it('marks exactly the nodeTested majors as tested', () => {
    const tested = model.pills.filter((p) => p.tested).map((p) => p.major)
    expect(tested).toEqual([22, 24])
  })

  it('drops the fully-excluded major (23) from the pills', () => {
    expect(model.pills.map((p) => p.major)).not.toContain(23)
  })
})

describe('deriveNode — simpler ranges', () => {
  it('a bare >= range has a whole-major floor and no gaps', () => {
    const model = deriveNode('>=20', [20, 22], 26)
    expect(model.headline).toBe('v20 → v26')
    expect(model.excluded).toBeNull()
    expect(model.pills.map((p) => p.major)).toEqual([
      20, 21, 22, 23, 24, 25, 26,
    ])
    expect(model.pills.every((p) => p.floor === null)).toBe(true)
    expect(model.pills.filter((p) => p.tested).map((p) => p.major)).toEqual([
      20, 22,
    ])
  })

  it('a caret is bounded to its own major (no overstating to latest)', () => {
    // `^18.12` == `>=18.12 <19`, so it covers ONLY major 18 — the headline stops
    // at v18 and there is no `19..26` excluded run.
    const model = deriveNode('^18.12', [18], 26)
    expect(model.headline).toBe('v18.12')
    expect(model.excluded).toBeNull()
    expect(model.pills).toEqual([{ major: 18, floor: '18.12', tested: true }])
  })
})

describe('deriveNode — upper bounds and hyphen ranges', () => {
  it('`>=22 <25` covers 22..24 (upper bound excludes 25)', () => {
    const model = deriveNode('>=22 <25', [], 26)
    expect(model.headline).toBe('v22 → v24')
    expect(model.pills.map((p) => p.major)).toEqual([22, 23, 24])
    expect(model.pills.every((p) => p.floor === null)).toBe(true)
    expect(model.excluded).toBeNull()
  })

  it('`>=22 <=25` includes 25 (inclusive upper bound)', () => {
    const model = deriveNode('>=22 <=25', [], 26)
    expect(model.headline).toBe('v22 → v25')
    expect(model.pills.map((p) => p.major)).toEqual([22, 23, 24, 25])
    expect(model.excluded).toBeNull()
  })

  it('`>=22 <25.3` reaches into 25 (partial major → included)', () => {
    const model = deriveNode('>=22 <25.3', [], 26)
    expect(model.headline).toBe('v22 → v25')
    expect(model.pills.map((p) => p.major)).toEqual([22, 23, 24, 25])
    expect(model.excluded).toBeNull()
  })

  it('a hyphen range `18 - 20` covers 18..20 inclusive', () => {
    const model = deriveNode('18 - 20', [], 26)
    expect(model.headline).toBe('v18 → v20')
    expect(model.pills.map((p) => p.major)).toEqual([18, 19, 20])
    expect(model.pills.every((p) => p.floor === null)).toBe(true)
    expect(model.excluded).toBeNull()
  })
})

describe('deriveNode — omit majors (drop EOL runtimes the range still permits)', () => {
  // 25 reached EOL 2026-06-01; omit it even though `>=25` permits it. The engines
  // string is shown verbatim on the card, so nothing is concealed — the pill for
  // an EOL runtime just goes away so the card does not steer users onto it.
  it('drops an omitted major from the pills, keeping the rest in order', () => {
    const model = deriveNode('^22.20 || ^24.12 || >=25', [22, 24], 26, [25])
    expect(model.pills).toEqual([
      { major: 22, floor: '22.20', tested: true },
      { major: 24, floor: '24.12', tested: true },
      { major: 26, floor: null, tested: false },
    ])
  })

  it('an omitted major is silent — not a pill and not an excluded mention', () => {
    const model = deriveNode('^22.20 || ^24.12 || >=25', [22, 24], 26, [25])
    expect(model.excluded).toContain('23')
    expect(model.excluded).not.toContain('25')
  })

  it('leaves the engines-derived headline untouched', () => {
    const model = deriveNode('^22.20 || ^24.12 || >=25', [22, 24], 26, [25])
    expect(model.headline).toBe('v22.20 → v26')
  })

  it('omitting nothing (arg absent) is the pre-existing behavior', () => {
    const model = deriveNode('^22.20 || ^24.12 || >=25', [22, 24], 26)
    expect(model.pills.map((p) => p.major)).toEqual([22, 24, 25, 26])
  })

  // Boundary cases — the headline and excluded prose must stay consistent with the
  // pills after an omission, not dangle at a major that no longer has a pill.
  it('omitting the ceiling major retracts the headline to the highest survivor', () => {
    const model = deriveNode('>=22', [], 26, [26])
    expect(model.pills.map((p) => p.major)).toEqual([22, 23, 24, 25])
    expect(model.headline).toBe('v22 → v25')
  })

  it('omitting the floor major advances the headline to the lowest survivor', () => {
    const model = deriveNode('^22.20 || ^24.12 || >=25', [22, 24], 26, [22])
    expect(model.pills.map((p) => p.major)).toEqual([24, 25, 26])
    expect(model.headline).toBe('v24.12 → v26')
  })

  it('omitting an already-excluded major silences its excluded mention', () => {
    const model = deriveNode('^22.20 || ^24.12 || >=25', [], 26, [23])
    expect(model.excluded).not.toContain('23')
    expect(model.excluded).toContain('24.0')
  })

  it('omitting every covered major yields no pills and a floor-only headline', () => {
    const model = deriveNode('^22.20', [], 26, [22])
    expect(model.pills).toEqual([])
    expect(model.headline).toBe('v22.20')
  })
})

describe('deriveNode — never throws on garbage', () => {
  it('returns a well-formed (empty) model for unparseable input', () => {
    const model = deriveNode('not a range', [], 26)
    expect(model.enginesRaw).toBe('not a range')
    expect(Array.isArray(model.pills)).toBe(true)
    expect(model.pills).toHaveLength(0)
    expect(model.excluded).toBeNull()
  })

  it('handles empty string without throwing', () => {
    expect(() => deriveNode('', [], 26)).not.toThrow()
  })

  it('rejects a number buried in junk (anchored parse, not mid-string)', () => {
    // `junk22junk` must NOT match the `22` mid-string → all clauses junk → the
    // empty fallback (headline is just the latest major, no pills).
    const model = deriveNode('junk22junk', [], 26)
    expect(model.headline).toBe('v26')
    expect(model.pills).toHaveLength(0)
    expect(model.excluded).toBeNull()
  })
})
