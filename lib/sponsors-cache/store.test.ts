// @vitest-environment node
// lib/sponsors-cache/store.test.ts
import { describe, it, expect } from 'vitest'
import {
  readManifest,
  readData,
  readImage,
  writeSnapshot,
  imageSlot,
  DATA_KEY,
  MANIFEST_KEY,
  type KVStore,
  type R2Store,
  type RenderedImage,
} from './store.ts'
import type { WashedSponsors } from '../landing/sponsors.ts'

function fakeKV(): KVStore & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    async get(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    async put(key: string, value: string) {
      store.set(key, value)
    },
  }
}
function fakeR2(): R2Store & { store: Map<string, Uint8Array> } {
  const store = new Map<string, Uint8Array>()
  return {
    store,
    async get(key: string) {
      if (!store.has(key)) return null
      const bytes = store.get(key)!
      return {
        async arrayBuffer() {
          return bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ) as ArrayBuffer
        },
      }
    },
    async put(key: string, value: ArrayBuffer | ArrayBufferView) {
      store.set(
        key,
        value instanceof ArrayBuffer
          ? new Uint8Array(value)
          : new Uint8Array((value as ArrayBufferView).buffer),
      )
    },
    async delete(key: string | string[]) {
      for (const k of Array.isArray(key) ? key : [key]) store.delete(k)
    },
  }
}
function sample(): WashedSponsors {
  return {
    specialThanks: [{ name: 'A', img: 'x', url: 'y' }],
    platinum: [],
    gold: [],
    sliver: [],
    backers: [],
  }
}
function images(tag: string): RenderedImage[] {
  return [
    {
      format: 'svg',
      theme: 'light',
      body: new TextEncoder().encode(`<svg>${tag}L</svg>`),
      contentType: 'image/svg+xml; charset=utf-8',
    },
    {
      format: 'svg',
      theme: 'dark',
      body: new TextEncoder().encode(`<svg>${tag}D</svg>`),
      contentType: 'image/svg+xml; charset=utf-8',
    },
    {
      format: 'png',
      theme: 'light',
      body: new Uint8Array([1, 2, 3]),
      contentType: 'image/png',
    },
    {
      format: 'png',
      theme: 'dark',
      body: new Uint8Array([4, 5, 6]),
      contentType: 'image/png',
    },
  ]
}

describe('store', () => {
  it('writeSnapshot persists data + manifest + 4 R2 objects; readers see them', async () => {
    const kv = fakeKV(),
      r2 = fakeR2()
    await writeSnapshot(kv, r2, sample(), 'v1', images('a'))
    expect(kv.store.has(DATA_KEY)).toBe(true)
    expect(kv.store.has(MANIFEST_KEY)).toBe(true)
    expect(r2.store.size).toBe(4)

    const data = await readData(kv)
    expect(data?.specialThanks[0].name).toBe('A')

    const manifest = await readManifest(kv)
    expect(manifest?.version).toBe('v1')
    expect(manifest?.images[imageSlot('png', 'dark')].key).toBe(
      'sponsors/v1/png-dark',
    )

    const img = await readImage(kv, r2, 'png', 'dark')
    expect([...img!.body]).toEqual([4, 5, 6])
    expect(img!.contentType).toBe('image/png')
  })

  it('a new snapshot version deletes the previous version R2 objects', async () => {
    const kv = fakeKV(),
      r2 = fakeR2()
    await writeSnapshot(kv, r2, sample(), 'v1', images('a'))
    await writeSnapshot(kv, r2, sample(), 'v2', images('b'))
    expect(r2.store.size).toBe(4) // only v2 objects remain
    expect(
      [...r2.store.keys()].every((k) => k.startsWith('sponsors/v2/')),
    ).toBe(true)
    expect((await readManifest(kv))?.version).toBe('v2')
  })

  it('readImage returns null when nothing is cached', async () => {
    expect(await readImage(fakeKV(), fakeR2(), 'svg', 'light')).toBeNull()
  })
})
