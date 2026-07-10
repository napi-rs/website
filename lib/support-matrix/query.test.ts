// @vitest-environment node
// lib/support-matrix/query.test.ts
// `buildSupportMatrixQuery` is the exact INVERSE of `parseSupportMatrixQuery`:
// it turns the URL-builder page's form state into the query string the
// /support-matrix.svg|png routes parse. The star test is the round-trip — the
// worked lzma example, built then parsed back, must reproduce the parsed shape.
import { describe, it, expect } from 'vitest'
import {
  buildSupportMatrixQuery,
  parseSupportMatrixQuery,
  type SupportMatrixQueryInput,
} from './query.ts'

// Re-parse a built query string the way the routes do (URLSearchParams.get).
function reparse(queryString: string) {
  const params = new URLSearchParams(queryString)
  return parseSupportMatrixQuery((key) => params.get(key) ?? undefined)
}

// The spec's worked example (targets already classified into tiers; `full` is a
// literal token in the tested list, exactly as the parser reads it).
const LZMA_INPUT: SupportMatrixQueryInput = {
  tested: ['full'],
  nonblocking: ['powerpc64le-unknown-linux-gnu', 's390x-unknown-linux-gnu'],
  untested: [
    'riscv64gc-unknown-linux-gnu',
    'aarch64-linux-android',
    'arm-linux-androideabi',
    'wasm32-wasi-preview1-threads',
  ],
  engines: '^22.20 || ^24.12 || >=25',
  nodeTested: [22, 24],
  name: '@napi-rs/lzma',
}

describe('buildSupportMatrixQuery — lzma round-trip (the important test)', () => {
  it('parsing the built query reproduces the parsed input shape', () => {
    const built = buildSupportMatrixQuery(LZMA_INPUT)
    expect(reparse(built)).toEqual({
      query: {
        tested: ['full'],
        nonblocking: [
          'powerpc64le-unknown-linux-gnu',
          's390x-unknown-linux-gnu',
        ],
        untested: [
          'riscv64gc-unknown-linux-gnu',
          'aarch64-linux-android',
          'arm-linux-androideabi',
          'wasm32-wasi-preview1-threads',
        ],
        omit: undefined,
        wasm: undefined,
        name: '@napi-rs/lzma',
        engines: '^22.20 || ^24.12 || >=25',
        nodeTested: [22, 24],
      },
      theme: 'light',
    })
  })

  it('emits exactly the params of the worked example, in order', () => {
    const built = buildSupportMatrixQuery(LZMA_INPUT)
    expect([...new URLSearchParams(built).keys()]).toEqual([
      'tested',
      'nonblocking',
      'untested',
      'engines',
      'nodeTested',
      'name',
    ])
  })

  it('URL-encodes the values so semver + scoped name survive decode', () => {
    const params = new URLSearchParams(buildSupportMatrixQuery(LZMA_INPUT))
    expect(params.get('tested')).toBe('full')
    expect(params.get('nonblocking')).toBe(
      'powerpc64le-unknown-linux-gnu,s390x-unknown-linux-gnu',
    )
    expect(params.get('engines')).toBe('^22.20 || ^24.12 || >=25')
    expect(params.get('nodeTested')).toBe('22,24')
    expect(params.get('name')).toBe('@napi-rs/lzma')
  })
})

describe('buildSupportMatrixQuery — omission + cleaning', () => {
  it('an empty input is the empty query string', () => {
    expect(buildSupportMatrixQuery({})).toBe('')
  })

  it('empty / whitespace-only tiers are dropped, tokens are trimmed', () => {
    const q = new URLSearchParams(
      buildSupportMatrixQuery({
        tested: ['  x86_64-apple-darwin  ', '', '   '],
        nonblocking: [],
      }),
    )
    expect(q.get('tested')).toBe('x86_64-apple-darwin')
    expect(q.has('nonblocking')).toBe(false)
  })

  it('theme is emitted only for dark; light is the implicit default', () => {
    expect(
      new URLSearchParams(buildSupportMatrixQuery({ theme: 'light' })).has(
        'theme',
      ),
    ).toBe(false)
    expect(
      new URLSearchParams(buildSupportMatrixQuery({ theme: 'dark' })).get(
        'theme',
      ),
    ).toBe('dark')
  })

  it('wasm is emitted as 1 only when true, and round-trips truthy', () => {
    expect(
      new URLSearchParams(buildSupportMatrixQuery({ wasm: false })).has('wasm'),
    ).toBe(false)
    const built = buildSupportMatrixQuery({ wasm: true })
    expect(new URLSearchParams(built).get('wasm')).toBe('1')
    // parser stores the raw string; resolver treats it as truthy.
    expect(reparse(built).query.wasm).toBe('1')
  })

  it('omit + non-integer nodeTested are handled', () => {
    const built = buildSupportMatrixQuery({
      omit: ['android', 'aarch64-linux-android'],
      // NaN / non-finite majors are filtered before joining.
      nodeTested: [22, Number.NaN, 24],
    })
    const q = new URLSearchParams(built)
    expect(q.get('omit')).toBe('android,aarch64-linux-android')
    expect(q.get('nodeTested')).toBe('22,24')
  })
})

describe('buildSupportMatrixQuery — theme + dark round-trip', () => {
  it('a dark build parses back to the dark theme', () => {
    const built = buildSupportMatrixQuery({ tested: ['full'], theme: 'dark' })
    expect(reparse(built).theme).toBe('dark')
  })
})
