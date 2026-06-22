// @vitest-environment node
//
// Unit tests for the changelog loader's FAILURE handling. The contract that
// matters for prod: loadChangelogHtml must NEVER throw — a throw surfaces as a
// raw Cloudflare 1101 (5xx) on a cold cache (no stale entry exists on a first /
// cookie-bearing request) — and must instead return a fallback page with
// `ok: false` so the caller can shorten the edge-cache TTL. Mocks `void/env`
// (a virtual module) + `void/log` + global `fetch`; the pure render side is
// covered by render.test.ts.
//
// Run: vp test run lib/changelog/load.test.ts
import { describe, it, expect, vi, afterEach } from 'vite-plus/test'

vi.mock('void/env', () => ({ env: { GITHUB_TOKEN: undefined } }))
vi.mock('void/log', () => ({ logger: { error: () => {} } }))

import { CHANGELOG_DEGRADED_REVALIDATE, loadChangelogHtml } from './load.ts'

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
  vi.restoreAllMocks()
})

describe('loadChangelogHtml — failure handling never throws', () => {
  it('a 403 rate-limit body → ok:false + fallback (not a throw)', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
          status: 403,
        }),
    ) as typeof fetch

    const res = await loadChangelogHtml('napi', 'en')
    expect(res.ok).toBe(false)
    expect(res.html).toContain('napi')
    expect(res.html).toContain('github.com/napi-rs/napi-rs/releases')
  })

  it('a thrown fetch ("Network connection lost") → ok:false + fallback', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('Network connection lost')
    }) as typeof fetch

    const res = await loadChangelogHtml('napi-build', 'en')
    expect(res.ok).toBe(false)
    expect(res.html).toContain('napi-build')
  })

  it('a 200 with a non-array body → ok:false + fallback', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: 'Bad credentials' }), {
          status: 200,
        }),
    ) as typeof fetch

    const res = await loadChangelogHtml('@napi-rs/cli', 'en')
    expect(res.ok).toBe(false)
    // The package name is HTML-escaped into the fallback heading.
    expect(res.html).toContain('@napi-rs/cli')
  })

  it('the degraded TTL is shorter than the 300s healthy window', () => {
    expect(CHANGELOG_DEGRADED_REVALIDATE).toBeGreaterThan(0)
    expect(CHANGELOG_DEGRADED_REVALIDATE).toBeLessThan(300)
  })
})
