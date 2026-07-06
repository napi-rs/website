// @vitest-environment node
// lib/landing/get-sponsors.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getCachedSponsors } from './get-sponsors.ts'
import { DATA_KEY, type KVStore } from '../sponsors-cache/store.ts'
import type { WashedSponsors } from './sponsors.ts'

const cached: WashedSponsors = {
  specialThanks: [],
  platinum: [{ name: 'KV', img: 'i', url: 'u' }],
  gold: [],
  sliver: [],
  backers: [],
}
const live: WashedSponsors = {
  specialThanks: [],
  platinum: [{ name: 'LIVE', img: 'i', url: 'u' }],
  gold: [],
  sliver: [],
  backers: [],
}

function kvWith(entries: Record<string, string>): KVStore {
  return {
    async get(k: string) {
      return entries[k] ?? null
    },
    async put() {},
  }
}

describe('getCachedSponsors', () => {
  it('returns the KV snapshot without calling live when present', async () => {
    const loadLive = vi.fn(async () => live)
    const out = await getCachedSponsors(
      kvWith({ [DATA_KEY]: JSON.stringify(cached) }),
      loadLive,
    )
    expect(out.platinum[0].name).toBe('KV')
    expect(loadLive).not.toHaveBeenCalled()
  })
  it('falls back to live when KV is empty', async () => {
    const loadLive = vi.fn(async () => live)
    const out = await getCachedSponsors(kvWith({}), loadLive)
    expect(out.platinum[0].name).toBe('LIVE')
    expect(loadLive).toHaveBeenCalledOnce()
  })
  it('falls back to live when KV binding is missing', async () => {
    const loadLive = vi.fn(async () => live)
    const out = await getCachedSponsors(undefined, loadLive)
    expect(out.platinum[0].name).toBe('LIVE')
  })
})
