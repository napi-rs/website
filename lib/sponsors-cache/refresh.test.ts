// @vitest-environment node
// lib/sponsors-cache/refresh.test.ts
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  refreshSponsorsCache,
  hashSponsors,
  type RefreshDeps,
} from './refresh.ts'
import {
  readManifest,
  readImage,
  readData,
  type KVStore,
  type R2Store,
} from './store.ts'
import { ensureYoga } from '../sponsors-image/card.ts'
import { ensureResvg } from '../sponsors-image/resvg.ts'
import type { SatoriFont } from '../sponsors-image/fonts.ts'
import type { ImageFetcher } from '../sponsors-image/avatars.ts'
import { wash, type WashedSponsors } from '../landing/sponsors.ts'

const yogaMod = new WebAssembly.Module(
  readFileSync('node_modules/satori/yoga.wasm'),
)
const resvgMod = new WebAssembly.Module(
  readFileSync('node_modules/@resvg/resvg-wasm/index_bg.wasm'),
)
const onePng = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
)

function fonts(): SatoriFont[] {
  const toAB = (b: Buffer): ArrayBuffer =>
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
  return [
    {
      name: 'Manrope',
      data: toAB(readFileSync('public/fonts/Manrope_700Bold.ttf')),
      weight: 700,
      style: 'normal',
    },
    {
      name: 'Manrope',
      data: toAB(readFileSync('public/fonts/Manrope_500Medium.ttf')),
      weight: 500,
      style: 'normal',
    },
  ]
}
function fakeKV(): KVStore & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    async get(k) {
      return store.get(k) ?? null
    },
    async put(k, v) {
      store.set(k, v)
    },
  }
}
function fakeR2(): R2Store & { store: Map<string, Uint8Array> } {
  const store = new Map<string, Uint8Array>()
  return {
    store,
    async get(k) {
      const b = store.get(k)
      return b
        ? {
            async arrayBuffer() {
              return b.buffer.slice(
                b.byteOffset,
                b.byteOffset + b.byteLength,
              ) as ArrayBuffer
            },
          }
        : null
    },
    async put(k, v) {
      store.set(
        k,
        v instanceof ArrayBuffer
          ? new Uint8Array(v)
          : new Uint8Array((v as ArrayBufferView).buffer),
      )
    },
    async delete(k) {
      for (const x of Array.isArray(k) ? k : [k]) store.delete(x)
    },
  }
}
const fetchImage: ImageFetcher = async () =>
  new Response(onePng, {
    status: 200,
    headers: { 'content-type': 'image/png' },
  })
const sponsors: WashedSponsors = {
  specialThanks: [],
  platinum: [
    { name: 'A', img: 'https://x/a.png', url: 'https://github.com/a' },
  ],
  gold: [],
  sliver: [],
  backers: [],
}

function deps(
  kv: KVStore,
  r2: R2Store,
  over: Partial<RefreshDeps> = {},
): RefreshDeps {
  return {
    kv,
    r2,
    loadFresh: async () => sponsors,
    loadFonts: async () => fonts(),
    fetchImage,
    yogaWasm: yogaMod,
    resvgWasm: resvgMod,
    ...over,
  }
}

beforeAll(async () => {
  await ensureYoga(yogaMod)
  await ensureResvg(resvgMod)
})

describe('refreshSponsorsCache', () => {
  it('renders 4 images, writes data + manifest + R2, and reports changed', async () => {
    const kv = fakeKV(),
      r2 = fakeR2()
    const result = await refreshSponsorsCache(deps(kv, r2))
    expect(result.changed).toBe(true)
    expect(result.imageCount).toBe(4)
    expect(r2.store.size).toBe(4)
    expect((await readData(kv))?.platinum[0].name).toBe('A')
    const png = await readImage(kv, r2, 'png', 'dark')
    expect([...png!.body.slice(0, 8)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ])
    const svg = await readImage(kv, r2, 'svg', 'light')
    expect(new TextDecoder().decode(svg!.body).startsWith('<svg')).toBe(true)
    expect((await readManifest(kv))?.version).toBe(result.version)
  })

  it('skips re-render when the data hash is unchanged and force is false', async () => {
    const kv = fakeKV(),
      r2 = fakeR2()
    await refreshSponsorsCache(deps(kv, r2))
    const second = await refreshSponsorsCache(deps(kv, r2, { force: false }))
    expect(second.changed).toBe(false)
    expect(second.imageCount).toBe(0)
  })

  it('re-renders unchanged data when force is true', async () => {
    const kv = fakeKV(),
      r2 = fakeR2()
    await refreshSponsorsCache(deps(kv, r2))
    const forced = await refreshSponsorsCache(deps(kv, r2, { force: true }))
    expect(forced.changed).toBe(true)
    expect(forced.imageCount).toBe(4)
  })

  it('degraded (empty) loadFresh does NOT overwrite an existing snapshot', async () => {
    const kv = fakeKV(),
      r2 = fakeR2()
    // Seed a good snapshot first.
    const seeded = await refreshSponsorsCache(deps(kv, r2))
    const putKv = vi.spyOn(kv, 'put')
    const putR2 = vi.spyOn(r2, 'put')
    // A degraded fetch (no token / non-200 / GraphQL error / timeout) washes to
    // all-empty tiers; even with force it must NOT clobber the good snapshot.
    const result = await refreshSponsorsCache(
      deps(kv, r2, { loadFresh: async () => wash({}), force: true }),
    )
    expect(result.changed).toBe(false)
    expect(result.imageCount).toBe(0)
    expect(result.version).toBe(seeded.version)
    // No write to DATA_KEY / MANIFEST_KEY and no R2 put happened.
    expect(putKv).not.toHaveBeenCalled()
    expect(putR2).not.toHaveBeenCalled()
    // The good data + images are preserved.
    expect((await readData(kv))?.platinum[0].name).toBe('A')
    expect(r2.store.size).toBe(4)
    expect((await readManifest(kv))?.version).toBe(seeded.version)
  })

  it('empty loadFresh on a cold cache (no manifest) still writes', async () => {
    const kv = fakeKV(),
      r2 = fakeR2()
    // Nothing better to serve on a truly cold cache: render + write the empty wall.
    const result = await refreshSponsorsCache(
      deps(kv, r2, { loadFresh: async () => wash({}), force: true }),
    )
    expect(result.changed).toBe(true)
    expect(result.imageCount).toBe(4)
    expect(r2.store.size).toBe(4)
  })

  it('hashSponsors is stable for equal data and differs for different data', async () => {
    const other: WashedSponsors = {
      ...sponsors,
      gold: [{ name: 'G', img: 'g', url: 'u' }],
    }
    expect(await hashSponsors(sponsors)).toBe(await hashSponsors(sponsors))
    expect(await hashSponsors(sponsors)).not.toBe(await hashSponsors(other))
  })
})
