// @vitest-environment node
// lib/support-matrix/targets.test.ts
import { describe, it, expect } from 'vitest'
import {
  TARGETS,
  FULL,
  OS_GROUPS,
  ALIASES,
  normalizeTriple,
} from './targets.ts'

describe('normalizeTriple', () => {
  it('maps both alias spellings to the canonical triple', () => {
    expect(normalizeTriple('wasm32-wasi-preview1-threads')).toBe(
      'wasm32-wasip1-threads',
    )
    expect(normalizeTriple('wasm32-wasip1-threads')).toBe(
      'wasm32-wasip1-threads',
    )
    expect(normalizeTriple('arm-linux-androideabi')).toBe(
      'armv7-linux-androideabi',
    )
    expect(normalizeTriple('armv7-linux-androideabi')).toBe(
      'armv7-linux-androideabi',
    )
  })

  it('returns a known triple unchanged and trims surrounding space', () => {
    expect(normalizeTriple('x86_64-apple-darwin')).toBe('x86_64-apple-darwin')
    expect(normalizeTriple('  aarch64-apple-darwin  ')).toBe(
      'aarch64-apple-darwin',
    )
  })

  it('returns null for unknown / malformed / prototype keys (never throws)', () => {
    expect(normalizeTriple('not-a-real-triple')).toBeNull()
    expect(normalizeTriple('')).toBeNull()
    expect(normalizeTriple('   ')).toBeNull()
    expect(normalizeTriple(undefined)).toBeNull()
    expect(normalizeTriple(null)).toBeNull()
    // prototype-pollution guard: `'__proto__' in {}` is true, hasOwn is not
    expect(normalizeTriple('__proto__')).toBeNull()
    expect(normalizeTriple('toString')).toBeNull()
    expect(normalizeTriple('constructor')).toBeNull()
  })
})

describe('FULL scaffold set', () => {
  const EXPECTED_FULL = [
    'x86_64-apple-darwin',
    'aarch64-apple-darwin',
    'x86_64-pc-windows-msvc',
    'i686-pc-windows-msvc',
    'aarch64-pc-windows-msvc',
    'x86_64-unknown-linux-gnu',
    'aarch64-unknown-linux-gnu',
    'armv7-unknown-linux-gnueabihf',
    'x86_64-unknown-linux-musl',
    'aarch64-unknown-linux-musl',
    'aarch64-linux-android',
    'armv7-linux-androideabi',
    'x86_64-unknown-freebsd',
    'wasm32-wasip1-threads',
  ]

  it('has exactly the 14 scaffold triples', () => {
    expect(FULL).toHaveLength(14)
    expect(new Set(FULL)).toEqual(new Set(EXPECTED_FULL))
  })

  it('every FULL triple has a TARGETS entry', () => {
    for (const triple of FULL) {
      expect(TARGETS[triple]).toBeTruthy()
    }
  })
})

describe('TARGETS', () => {
  it('includes the additional (non-scaffold) triples', () => {
    const additional = [
      'powerpc64le-unknown-linux-gnu',
      's390x-unknown-linux-gnu',
      'riscv64gc-unknown-linux-gnu',
      'aarch64-unknown-freebsd',
      'armv7-unknown-linux-musleabihf',
      'riscv64gc-unknown-linux-musl',
      'x86_64-unknown-linux-ohos',
      'aarch64-unknown-linux-ohos',
      'armv7-unknown-linux-ohos',
    ]
    for (const triple of additional) {
      expect(TARGETS[triple as keyof typeof TARGETS]).toBeTruthy()
      // additional triples exist but are NOT seeded by `full`
      expect(FULL).not.toContain(triple)
    }
  })

  it('label = `{arch}[ {abi}]` for every entry', () => {
    for (const info of Object.values(TARGETS)) {
      const expected = info.abi ? `${info.arch} ${info.abi}` : info.arch
      expect(info.label).toBe(expected)
    }
  })

  it('produces the exact display labels from the spec', () => {
    const cases: Record<string, string> = {
      'x86_64-unknown-linux-gnu': 'x64 gnu',
      'x86_64-unknown-linux-musl': 'x64 musl',
      'aarch64-unknown-linux-gnu': 'arm64 gnu',
      'aarch64-unknown-linux-musl': 'arm64 musl',
      'armv7-unknown-linux-gnueabihf': 'armv7 gnu',
      'armv7-unknown-linux-musleabihf': 'armv7 musl',
      'powerpc64le-unknown-linux-gnu': 'ppc64le',
      's390x-unknown-linux-gnu': 's390x',
      'riscv64gc-unknown-linux-gnu': 'riscv64 gnu',
      'riscv64gc-unknown-linux-musl': 'riscv64 musl',
      'x86_64-pc-windows-msvc': 'x64',
      'i686-pc-windows-msvc': 'x32',
      'aarch64-pc-windows-msvc': 'arm64',
      'x86_64-apple-darwin': 'x64',
      'aarch64-apple-darwin': 'arm64',
      'aarch64-linux-android': 'arm64',
      'armv7-linux-androideabi': 'armv7',
      'x86_64-unknown-freebsd': 'x64',
      'aarch64-unknown-freebsd': 'arm64',
      'wasm32-wasip1-threads': 'wasm32-wasi',
      'x86_64-unknown-linux-ohos': 'x64',
      'aarch64-unknown-linux-ohos': 'arm64',
      'armv7-unknown-linux-ohos': 'armv7',
    }
    for (const [triple, label] of Object.entries(cases)) {
      expect(TARGETS[triple as keyof typeof TARGETS].label).toBe(label)
    }
  })

  it('assigns each triple to one of the seven OS groups', () => {
    const validOs = new Set([
      'Linux',
      'Windows',
      'macOS',
      'Android',
      'FreeBSD',
      'OpenHarmony',
      'Browser',
    ])
    for (const info of Object.values(TARGETS)) {
      expect(validOs.has(info.os)).toBe(true)
    }
  })
})

describe('OS_GROUPS', () => {
  it('is keyed by the lowercased OS name', () => {
    for (const key of Object.keys(OS_GROUPS)) {
      expect(key).toBe(key.toLowerCase())
    }
    for (const key of [
      'linux',
      'windows',
      'macos',
      'android',
      'freebsd',
      'openharmony',
      'browser',
    ]) {
      expect(OS_GROUPS[key]).toBeTruthy()
    }
  })

  it('android holds exactly the two android triples', () => {
    expect(OS_GROUPS.android).toEqual([
      'aarch64-linux-android',
      'armv7-linux-androideabi',
    ])
  })

  it('every grouped triple round-trips to its OS field', () => {
    for (const [key, triples] of Object.entries(OS_GROUPS)) {
      for (const triple of triples) {
        expect(TARGETS[triple].os.toLowerCase()).toBe(key)
      }
    }
  })
})

describe('ALIASES', () => {
  it('maps each alias to a canonical triple that exists in TARGETS', () => {
    for (const [alias, canonical] of Object.entries(ALIASES)) {
      expect(alias in TARGETS).toBe(false)
      expect(TARGETS[canonical]).toBeTruthy()
    }
  })
})
