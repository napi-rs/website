// crons/refresh-sponsors.ts
// Daily full re-render of the sponsors cache (force) so avatar/name changes that
// never fire a sponsorship webhook are still picked up. 05:00 UTC = low traffic.
import { defineScheduled } from 'void'
import yogaWasm from 'satori/yoga.wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import { loadSponsors } from '../lib/landing/load-sponsors.ts'
import {
  loadFonts,
  readAsset,
  type AssetsFetcher,
} from '../lib/sponsors-image/fonts.ts'
import { refreshSponsorsCache } from '../lib/sponsors-cache/refresh.ts'
import type { KVStore, R2Store } from '../lib/sponsors-cache/store.ts'

export const cron = '0 5 * * *'

export default defineScheduled(async (_controller, env) => {
  const e = env as unknown as {
    KV: KVStore
    STORAGE: R2Store
    ASSETS: AssetsFetcher
  }
  // The scheduled context has no request URL; the ASSETS binding serves by path,
  // so the host in the base URL is irrelevant — any absolute URL works.
  const base = 'https://napi.rs/'
  await refreshSponsorsCache({
    kv: e.KV,
    r2: e.STORAGE,
    loadFresh: () => loadSponsors({ bypassCache: true }),
    loadFonts: () => loadFonts((p) => readAsset(e.ASSETS, base, p)),
    yogaWasm,
    resvgWasm,
    force: true,
  })
})
