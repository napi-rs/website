// @vitest-environment node
// lib/support-matrix/routes.test.ts
// Covers the two public badge endpoints (routes/support-matrix.{svg,png}.ts) and
// the shared query parser (lib/support-matrix/query.ts). Lives under lib/ (not
// routes/) so Void's route scanner never registers it as a live `/…​.test` route
// — the regression guard at the bottom asserts routes/ stays test-file free.
//
// The route files statically `import … from '*.wasm'`, which Void's build turns
// into a real WebAssembly.Module at the edge. Vitest has no such transform (the
// void plugin is skipped under VITEST — see vite.config.ts), so a bare .wasm
// import throws "Cannot find package". We substitute the exact edge artifact —
// `new WebAssembly.Module(bytes)` — via vi.mock, so importing the *real* GET
// handlers runs the full parse → resolve → loadFonts → renderMatrix → Response
// pipeline for real (satori + resvg included), not a re-implementation of it.
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'

vi.mock('satori/yoga.wasm', () => ({
  default: new WebAssembly.Module(
    readFileSync('node_modules/satori/yoga.wasm'),
  ),
}))
vi.mock('@resvg/resvg-wasm/index_bg.wasm', () => ({
  default: new WebAssembly.Module(
    readFileSync('node_modules/@resvg/resvg-wasm/index_bg.wasm'),
  ),
}))

import { parseSupportMatrixQuery } from './query.ts'
import { resolveMatrix, type MatrixModel } from './resolve.ts'

// --- a stub Hono context: query getter over URLSearchParams + an ASSETS binding
// that reads public/fonts/* from disk (exactly what the worker's ASSETS does). ---
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

const ASSETS = {
  async fetch(input: URL): Promise<Response> {
    // input.pathname is like /fonts/Manrope_700Bold.ttf — read it from ./public.
    const bytes = readFileSync(`public${input.pathname}`)
    return new Response(new Uint8Array(bytes), { status: 200 })
  },
}

function makeContext(search: string) {
  const params = new URLSearchParams(search)
  return {
    req: {
      query: (key: string) => params.get(key) ?? undefined,
      url: `http://localhost/support-matrix.svg?${search}`,
    },
    env: { ASSETS },
  }
}

// The spec's worked example query string (the exact params a caller would put in
// a README badge URL). Round-tripped through the parser + resolver below.
const LZMA_SEARCH =
  'tested=full' +
  '&nonblocking=powerpc64le-unknown-linux-gnu,s390x-unknown-linux-gnu' +
  '&untested=riscv64gc-unknown-linux-gnu,aarch64-linux-android,arm-linux-androideabi,wasm32-wasi-preview1-threads' +
  '&engines=' +
  encodeURIComponent('^22.20 || ^24.12 || >=25') +
  '&nodeTested=22,24' +
  '&name=' +
  encodeURIComponent('@napi-rs/lzma') +
  '&theme=dark'

function allChips(m: MatrixModel) {
  return [...m.platforms.flatMap((p) => p.chips), ...(m.browser?.chips ?? [])]
}

describe('parseSupportMatrixQuery', () => {
  const get = (search: string) => {
    const p = new URLSearchParams(search)
    return (key: string) => p.get(key) ?? undefined
  }

  it('comma-splits list params (trim + drop empties) and parses nodeTested → numbers', () => {
    const { query } = parseSupportMatrixQuery(
      get('tested=full&nonblocking=a, b ,,c&nodeTested=22,24'),
    )
    expect(query.tested).toEqual(['full'])
    expect(query.nonblocking).toEqual(['a', 'b', 'c'])
    expect(query.nodeTested).toEqual([22, 24])
  })

  it('passes engines and name through as raw strings; wasm as-is', () => {
    const { query } = parseSupportMatrixQuery(
      get(
        'engines=' +
          encodeURIComponent('^22 || >=24') +
          '&name=%40x%2Fy&wasm=1',
      ),
    )
    expect(query.engines).toBe('^22 || >=24')
    expect(query.name).toBe('@x/y')
    expect(query.wasm).toBe('1')
  })

  it('leaves absent params undefined (not empty arrays)', () => {
    const { query } = parseSupportMatrixQuery(get(''))
    expect(query.tested).toBeUndefined()
    expect(query.nonblocking).toBeUndefined()
    expect(query.untested).toBeUndefined()
    expect(query.omit).toBeUndefined()
    expect(query.nodeTested).toBeUndefined()
    expect(query.engines).toBeUndefined()
    expect(query.name).toBeUndefined()
    expect(query.wasm).toBeUndefined()
  })

  it('parses theme (dark opt-in; default light)', () => {
    expect(parseSupportMatrixQuery(get('theme=dark')).theme).toBe('dark')
    expect(parseSupportMatrixQuery(get('theme=light')).theme).toBe('light')
    expect(parseSupportMatrixQuery(get('')).theme).toBe('light')
    expect(parseSupportMatrixQuery(get('theme=nonsense')).theme).toBe('light')
  })

  it('never throws on a malformed query and drops non-numeric nodeTested', () => {
    const { query } = parseSupportMatrixQuery(
      get('tested=not-a-triple&engines=@@@&nodeTested=x,3,y'),
    )
    expect(query.tested).toEqual(['not-a-triple'])
    expect(query.engines).toBe('@@@')
    expect(query.nodeTested).toEqual([3])
  })

  it('drops digit-prefixed junk in nodeTested (22garbage is not Node 22)', () => {
    const { query } = parseSupportMatrixQuery(
      get('nodeTested=22garbage,24,3.5,18'),
    )
    // `22garbage` and `3.5` are not whole-digit tokens → dropped, so the badge
    // never marks a major CI-tested from a mistyped value.
    expect(query.nodeTested).toEqual([24, 18])
  })

  it('round-trips the spec lzma query string → the exact 17-target model', () => {
    const { query, theme } = parseSupportMatrixQuery(get(LZMA_SEARCH))
    expect(theme).toBe('dark')
    const model = resolveMatrix(query)
    expect(model.name).toBe('@napi-rs/lzma')
    expect(allChips(model)).toHaveLength(17)
    expect(model.node?.headline).toBe('v22.20 → v26')
    expect(model.browser?.chips).toEqual([
      { label: 'wasm32-wasi', tier: 'untested' },
    ])
  })
})

// --- Integration: the real GET handlers, driven with a stub context. ---
describe('GET /support-matrix.{svg,png}', () => {
  let svgGET: (c: unknown) => Promise<Response> | Response
  let pngGET: (c: unknown) => Promise<Response> | Response

  beforeAll(async () => {
    svgGET = (await import('../../routes/support-matrix.svg.ts')).GET as never
    pngGET = (await import('../../routes/support-matrix.png.ts')).GET as never
  })

  it('svg handler is a function and returns image/svg+xml with a <svg> body', async () => {
    expect(typeof svgGET).toBe('function')
    const res = await svgGET(makeContext(LZMA_SEARCH))
    expect(res.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8')
    expect(res.headers.get('Cache-Control')).toBe(
      'public, s-maxage=86400, max-age=86400, stale-while-revalidate=604800',
    )
    const body = await res.text()
    expect(body.startsWith('<svg')).toBe(true)
  })

  it('png handler is a function and returns image/png bytes', async () => {
    expect(typeof pngGET).toBe('function')
    const res = await pngGET(makeContext(LZMA_SEARCH))
    expect(res.headers.get('Content-Type')).toBe('image/png')
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(Array.from(bytes.slice(0, 8))).toEqual(PNG_MAGIC)
  })

  it('a malformed query still returns a valid image (never 500)', async () => {
    const bad = 'tested=not-a-triple&engines=@@@&nodeTested=x'
    const svg = await svgGET(makeContext(bad))
    expect(svg.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8')
    expect((await svg.text()).startsWith('<svg')).toBe(true)

    const png = await pngGET(makeContext(bad))
    expect(png.headers.get('Content-Type')).toBe('image/png')
    expect(
      Array.from(new Uint8Array(await png.arrayBuffer()).slice(0, 8)),
    ).toEqual(PNG_MAGIC)
  })
})

// --- Regression guard: no test/spec file may live under routes/. ---
// Void's route scanner globs `routes/**/*.ts` (only `_`-prefixed and websocket
// files are excluded — there is NO test/spec exclusion), so a `*.test.ts` there
// registers a bogus `/…​.test` route with `methods: []` that throws at runtime
// (no default export) and drags vitest + node:fs into the worker bundle. This
// suite USED to live in routes/; keep it — and every future route test — under
// lib/. Walks routes/ with node:fs (stable across Void's hashed internals).
describe('routes/ contains no test files', () => {
  function collectTsFiles(dir: string): string[] {
    const out: string[] = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`
      if (entry.isDirectory()) out.push(...collectTsFiles(full))
      else if (/\.tsx?$/.test(entry.name)) out.push(full)
    }
    return out
  }

  it('no routes/**/*.{test,spec}.{ts,tsx} — those would register as live routes', () => {
    const offenders = collectTsFiles('routes').filter((f) =>
      /\.(test|spec)\.tsx?$/.test(f),
    )
    expect(offenders).toEqual([])
  })
})
