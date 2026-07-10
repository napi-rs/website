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

  it('a caret with a minor floor formats the floor as maj.min', () => {
    const model = deriveNode('^18.12', [18], 26)
    expect(model.headline).toBe('v18.12 → v26')
    // 18 is the floor major; everything above it (19..26) is a gap
    expect(model.excluded).toContain('19')
    expect(model.pills).toEqual([{ major: 18, floor: '18.12', tested: true }])
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
})
