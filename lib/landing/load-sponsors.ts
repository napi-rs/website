import { wash, type WashedSponsors } from './sponsors.ts'

const SPONSORS_URL = 'https://sponsors.napi.rs/sponsor.json'

// Hard deadline for the sponsors fetch. The landing loaders run per request
// (prerender=false, revalidate=0), so an unbounded fetch would let a stalled
// sponsors.napi.rs hang the whole landing SSR response. AbortSignal.timeout
// rejects the fetch after this many ms; the catch below then degrades to empty
// tiers, exactly like a network error.
const SPONSORS_FETCH_TIMEOUT_MS = 3000

// Shared sponsor fetch used by all three landing loaders (en/cn/pt-BR). Fetches
// the raw payload with a User-Agent and washes it into the tiered shape. On any
// failure (network, non-200, bad JSON, TIMEOUT) returns empty tiers so the page
// still renders. Pure-ish: no globals beyond `fetch`, safe to run in the worker
// SSR loader.
export async function loadSponsors(): Promise<WashedSponsors> {
  try {
    const res = await fetch(SPONSORS_URL, {
      headers: { 'User-Agent': 'napi-rs-website' },
      signal: AbortSignal.timeout(SPONSORS_FETCH_TIMEOUT_MS),
    })
    if (!res.ok) {
      return wash({})
    }
    const raw = JSON.parse(await res.text())
    return wash(raw)
  } catch {
    return wash({})
  }
}
