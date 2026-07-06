// @vitest-environment node
// lib/sponsors-cache/store.test.ts
import { describe, it, expect, vi } from 'vitest'
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
    await writeSnapshot(kv, r2, sample(), 'v1', images('a'), null)
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
    await writeSnapshot(kv, r2, sample(), 'v1', images('a'), null)
    await writeSnapshot(kv, r2, sample(), 'v2', images('b'), 'v1')
    expect(r2.store.size).toBe(4) // only v2 objects remain
    expect(
      [...r2.store.keys()].every((k) => k.startsWith('sponsors/v2/')),
    ).toBe(true)
    expect((await readManifest(kv))?.version).toBe('v2')
  })

  it('readImage returns null when nothing is cached', async () => {
    expect(await readImage(fakeKV(), fakeR2(), 'svg', 'light')).toBeNull()
  })

  it('aborts the flip (no rollback) when a newer version was published mid-render', async () => {
    const kv = fakeKV(),
      r2 = fakeR2()
    // A concurrent refresh published "winner" while we were rendering: its
    // manifest + one blob are live. Our writer started when the cache was "v1".
    kv.store.set(
      MANIFEST_KEY,
      JSON.stringify({
        version: 'winner',
        updatedAt: '',
        images: {
          [imageSlot('svg', 'light')]: {
            key: 'sponsors/winner/svg-light',
            contentType: 'image/svg+xml; charset=utf-8',
          },
        },
      }),
    )
    r2.store.set('sponsors/winner/svg-light', new Uint8Array([9, 9, 9]))
    const deleteSpy = vi.spyOn(r2, 'delete')

    // Publish v2 based on expectedVersion 'v1' — but the pointer is now "winner",
    // so the CAS must abort: don't overwrite data/manifest, drop our just-uploaded
    // v2 blobs, and never touch the winner's blob.
    await writeSnapshot(kv, r2, sample(), 'v2', images('b'), 'v1')

    expect((await readManifest(kv))?.version).toBe('winner')
    expect(r2.store.has('sponsors/winner/svg-light')).toBe(true)
    expect([...r2.store.keys()].some((k) => k.startsWith('sponsors/v2/'))).toBe(
      false,
    )
    // The only delete was our own orphan cleanup (v2 keys), never the winner's.
    for (const call of deleteSpy.mock.calls) {
      const keys = Array.isArray(call[0]) ? call[0] : [call[0]]
      expect(keys.every((k) => k.startsWith('sponsors/v2/'))).toBe(true)
    }
  })

  it('readData / readManifest return null on corrupt JSON', async () => {
    const kv: KVStore = {
      async get() {
        return '{not json'
      },
      async put() {},
    }
    expect(await readManifest(kv)).toBeNull()
    expect(await readData(kv)).toBeNull()
  })
})
