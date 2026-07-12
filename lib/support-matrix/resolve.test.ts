// @vitest-environment node
// lib/support-matrix/resolve.test.ts
import { describe, it, expect } from 'vitest'
import { resolveMatrix, type MatrixModel, type Chip } from './resolve.ts'

// Flatten every chip the model renders (native platforms + browser).
function allChips(model: MatrixModel): Chip[] {
  const chips = model.platforms.flatMap((p) => p.chips)
  if (model.browser) chips.push(...model.browser.chips)
  return chips
}
function tierCount(model: MatrixModel, tier: Chip['tier']): number {
  return allChips(model).filter((c) => c.tier === tier).length
}
function section(model: MatrixModel, os: string) {
  return model.platforms.find((p) => p.os === os)
}

describe('resolveMatrix — full seed', () => {
  it('tested=full yields 14 chips, all tested, grouped by OS', () => {
    const model = resolveMatrix({ tested: 'full' })
    const chips = allChips(model)
    expect(chips).toHaveLength(14)
    expect(chips.every((c) => c.tier === 'tested')).toBe(true)

    // the native OS sections the scaffold covers
    expect(section(model, 'macOS')?.chips).toHaveLength(2)
    expect(section(model, 'Windows')?.chips).toHaveLength(3)
    expect(section(model, 'Linux')?.chips).toHaveLength(5)
    expect(section(model, 'Android')?.chips).toHaveLength(2)
    expect(section(model, 'FreeBSD')?.chips).toHaveLength(1)
    // wasm lives in the Browser section, never in a platform group
    expect(model.browser).not.toBeNull()
    expect(model.browser?.chips.map((c) => c.label)).toEqual(['wasm32-wasi'])
    expect(section(model, 'Browser')).toBeUndefined()
  })
})

describe('resolveMatrix — explicit tiers override the seed', () => {
  it('a triple in untested downgrades out of the full seed', () => {
    const model = resolveMatrix({
      tested: 'full',
      untested: 'x86_64-apple-darwin',
    })
    expect(allChips(model)).toHaveLength(14)
    const mac = section(model, 'macOS')!
    const x64 = mac.chips.find((c) => c.label === 'x64')!
    expect(x64.tier).toBe('untested')
    expect(tierCount(model, 'untested')).toBe(1)
    expect(tierCount(model, 'tested')).toBe(13)
  })

  it('a non-scaffold triple in nonblocking is added', () => {
    const model = resolveMatrix({
      tested: 'full',
      nonblocking: 's390x-unknown-linux-gnu',
    })
    expect(allChips(model)).toHaveLength(15)
    const linux = section(model, 'Linux')!
    const s390x = linux.chips.find((c) => c.label === 's390x')
    expect(s390x).toBeTruthy()
    expect(s390x!.tier).toBe('nonblocking')
    expect(tierCount(model, 'nonblocking')).toBe(1)
  })

  it('most-severe wins when a triple appears in two explicit tiers', () => {
    const model = resolveMatrix({
      tested: 'full',
      nonblocking: 'x86_64-unknown-linux-gnu',
      untested: 'x86_64-unknown-linux-gnu',
    })
    const linux = section(model, 'Linux')!
    const chip = linux.chips.find((c) => c.label === 'x64 gnu')!
    expect(chip.tier).toBe('untested')
    // nothing was double-counted
    expect(allChips(model)).toHaveLength(14)
  })
})

describe('resolveMatrix — omit', () => {
  it('omit=android removes both android chips and the section', () => {
    const model = resolveMatrix({ tested: 'full', omit: 'android' })
    expect(section(model, 'Android')).toBeUndefined()
    expect(allChips(model)).toHaveLength(12)
  })

  it('omit=<triple> removes exactly one chip', () => {
    const model = resolveMatrix({
      tested: 'full',
      omit: 'aarch64-linux-android',
    })
    const android = section(model, 'Android')!
    expect(android.chips).toHaveLength(1)
    expect(android.chips[0].label).toBe('armv7')
    expect(allChips(model)).toHaveLength(13)
  })
})

describe('resolveMatrix — robustness', () => {
  it('malformed triples are skipped, never thrown', () => {
    let model!: MatrixModel
    expect(() => {
      model = resolveMatrix({
        tested: 'full',
        nonblocking: 'not-a-real-triple',
      })
    }).not.toThrow()
    expect(allChips(model)).toHaveLength(14)
    expect(allChips(model).some((c) => c.label.includes('real'))).toBe(false)
  })

  it('an empty query yields an empty, well-formed model', () => {
    const model = resolveMatrix({})
    expect(model.platforms).toEqual([])
    expect(model.browser).toBeNull()
    expect(model.node).toBeNull()
    expect(model.name).toBeUndefined()
  })
})

describe('resolveMatrix — browser / wasm', () => {
  it('wasm truthy forces a Browser section even without a wasm triple', () => {
    const model = resolveMatrix({ tested: 'x86_64-apple-darwin', wasm: '1' })
    expect(model.browser).not.toBeNull()
    expect(model.browser?.chips.map((c) => c.label)).toEqual(['wasm32-wasi'])
    // native section unaffected
    expect(section(model, 'macOS')?.chips).toHaveLength(1)
  })

  it('no wasm triple and no wasm flag => no Browser section', () => {
    const model = resolveMatrix({ tested: 'x86_64-apple-darwin' })
    expect(model.browser).toBeNull()
  })
})

describe('resolveMatrix — name + node passthrough', () => {
  it('carries a trimmed name and derives the node model from engines', () => {
    const model = resolveMatrix({
      name: '  @napi-rs/lzma  ',
      tested: 'full',
      engines: '^22.20 || ^24.12 || >=25',
      nodeTested: '22,24',
    })
    expect(model.name).toBe('@napi-rs/lzma')
    expect(model.node).not.toBeNull()
    expect(model.node?.headline).toBe('v22.20 → v26')
  })
})

describe('resolveMatrix — nodeOmit passthrough', () => {
  it('drops an EOL major the engines range still permits', () => {
    const model = resolveMatrix({
      engines: '^22.20 || ^24.12 || >=25',
      nodeTested: '22,24',
      nodeOmit: '25',
    })
    expect(model.node?.pills.map((p) => p.major)).toEqual([22, 24, 26])
  })

  it('sanitizes nodeOmit like nodeTested — junk tokens omit nothing', () => {
    const model = resolveMatrix({
      engines: '^22.20 || ^24.12 || >=25',
      nodeOmit: '25garbage,junk',
    })
    expect(model.node?.pills.map((p) => p.major)).toContain(25)
  })
})

// The spec's worked example — must produce exactly this shape.
describe('resolveMatrix — lzma fixture', () => {
  const model = resolveMatrix({
    tested: 'full',
    nonblocking: 'powerpc64le-unknown-linux-gnu,s390x-unknown-linux-gnu',
    untested:
      'riscv64gc-unknown-linux-gnu,aarch64-linux-android,arm-linux-androideabi,wasm32-wasi-preview1-threads',
    engines: '^22.20 || ^24.12 || >=25',
    nodeTested: '22,24',
  })

  it('yields 11 tested / 2 nonblocking / 4 untested = 17 targets', () => {
    expect(allChips(model)).toHaveLength(17)
    expect(tierCount(model, 'tested')).toBe(11)
    expect(tierCount(model, 'nonblocking')).toBe(2)
    expect(tierCount(model, 'untested')).toBe(4)
  })

  it('the two nonblocking chips are ppc64le and s390x (Linux)', () => {
    const linux = section(model, 'Linux')!
    const nb = linux.chips.filter((c) => c.tier === 'nonblocking')
    expect(nb.map((c) => c.label).sort()).toEqual(['ppc64le', 's390x'])
  })

  it('the wasm target is the Browser section (untested), not a platform', () => {
    expect(model.browser).not.toBeNull()
    expect(model.browser?.chips).toEqual([
      { label: 'wasm32-wasi', tier: 'untested' },
    ])
    // 16 native platform chips, wasm excluded from them
    expect(model.platforms.flatMap((p) => p.chips)).toHaveLength(16)
    expect(
      model.platforms
        .flatMap((p) => p.chips)
        .some((c) => c.label === 'wasm32-wasi'),
    ).toBe(false)
  })

  it('the two android chips are downgraded to untested', () => {
    const android = section(model, 'Android')!
    expect(android.chips.every((c) => c.tier === 'untested')).toBe(true)
    expect(android.chips).toHaveLength(2)
  })
})

describe('resolveMatrix — hardened params', () => {
  it('caps an oversized engines param so it cannot bloat the model', () => {
    const model = resolveMatrix({ engines: 'x'.repeat(5000) })
    expect(model.node).not.toBeNull()
    expect(model.node!.enginesRaw.length).toBeLessThanOrEqual(64)
  })

  it('leaves a normal engines value untouched', () => {
    const model = resolveMatrix({ engines: '^22.20 || ^24.12 || >=25' })
    expect(model.node?.enginesRaw).toBe('^22.20 || ^24.12 || >=25')
  })

  it('drops nodeTested tokens that are not clean integers', () => {
    const model = resolveMatrix({
      engines: '>=22',
      nodeTested: '22garbage,24xyz,junk',
    })
    // `22garbage` must NOT survive as 22 — none of these paint a green major.
    expect(model.node?.pills.some((p) => p.tested)).toBe(false)
  })

  it('a clean nodeTested integer still marks its major', () => {
    const model = resolveMatrix({ engines: '>=22', nodeTested: '22' })
    expect(model.node?.pills.find((p) => p.major === 22)?.tested).toBe(true)
  })
})
