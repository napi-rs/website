// routes/webhooks/github-sponsors.ts
// POST /webhooks/github-sponsors — GitHub Sponsors webhook receiver. Verifies the
// HMAC signature over the raw body, then refreshes the cache in the background so
// we return 2xx well within GitHub's 10s deadline.
import { defineHandler } from 'void'
import { env } from 'void/env'
import yogaWasm from 'satori/yoga.wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import { verifyGithubSignature } from '../../lib/sponsors-cache/signature.ts'
import { loadSponsors } from '../../lib/landing/load-sponsors.ts'
import {
  loadFonts,
  readAsset,
  type AssetsFetcher,
} from '../../lib/sponsors-image/fonts.ts'
import { refreshSponsorsCache } from '../../lib/sponsors-cache/refresh.ts'
import type { KVStore, R2Store } from '../../lib/sponsors-cache/store.ts'

export const POST = defineHandler(async (c) => {
  const secret = env.GITHUB_SPONSORS_WEBHOOK_SECRET
  if (!secret) return c.text('webhook not configured', 503)

  const raw = await c.req.text()
  const valid = await verifyGithubSignature(
    secret,
    raw,
    c.req.header('x-hub-signature-256'),
  )
  if (!valid) return c.text('invalid signature', 401)

  if (c.req.header('x-github-event') !== 'sponsorship') return c.body(null, 204)

  const e = c.env as unknown as {
    KV: KVStore
    STORAGE: R2Store
    ASSETS: AssetsFetcher
  }
  c.executionCtx.waitUntil(
    refreshSponsorsCache({
      kv: e.KV,
      r2: e.STORAGE,
      loadFresh: () => loadSponsors({ bypassCache: true }),
      loadFonts: () => loadFonts((p) => readAsset(e.ASSETS, c.req.url, p)),
      yogaWasm,
      resvgWasm,
      force: false,
    }),
  )
  return c.body(null, 202)
})
