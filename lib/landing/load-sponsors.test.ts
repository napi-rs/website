// @vitest-environment node
// lib/landing/load-sponsors.test.ts
// The loader reads `env.GITHUB_TOKEN` via void's `env` proxy, which resolves
// from `globalThis.__env__` (its Nuxt-env source) in a plain node/vitest run —
// it does NOT read `process.env`. So we seed the token in-test rather than via a
// shell prefix. Run: corepack yarn vp test run <this file>
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadSponsors } from './load-sponsors.ts'

const EMPTY_PAYLOAD = {
  data: {
    org: {
      sponsorshipsAsMaintainer: { pageInfo: { hasNextPage: false }, nodes: [] },
    },
    special: null,
  },
}

describe('loadSponsors bypassCache', () => {
  let calls: number
  beforeEach(() => {
    // The loader requires a token; seed it through void's `globalThis.__env__`
    // source so `env.GITHUB_TOKEN` resolves (see the file header note).
    ;(globalThis as unknown as { __env__: Record<string, string> }).__env__ = {
      GITHUB_TOKEN: 'dummy',
    }
    calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1
        return new Response(JSON.stringify(EMPTY_PAYLOAD), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as unknown as { __env__?: Record<string, string> })
      .__env__
  })

  it('caches by default and bypasses when asked', async () => {
    await loadSponsors() // fetch #1, populates the in-isolate cache
    expect(calls).toBe(1)
    await loadSponsors() // served from cache, no fetch
    expect(calls).toBe(1)
    await loadSponsors({ bypassCache: true }) // forces fetch #2
    expect(calls).toBe(2)
  })
})
