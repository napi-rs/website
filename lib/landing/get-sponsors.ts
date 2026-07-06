// lib/landing/get-sponsors.ts
// KV-first sponsor list for consumers (landing loaders + the image cold path):
// return the cron/webhook-maintained snapshot when present, else the live GitHub
// fetch so the site still works before the first refresh.

import type { WashedSponsors } from './sponsors.ts'
import { readData, type KVStore } from '../sponsors-cache/store.ts'
import { loadSponsors } from './load-sponsors.ts'

export async function getCachedSponsors(
  kv: KVStore | undefined,
  loadLive: () => Promise<WashedSponsors> = loadSponsors,
): Promise<WashedSponsors> {
  if (kv) {
    const cached = await readData(kv)
    if (cached) return cached
  }
  return loadLive()
}
