import { wash, type WashedSponsors } from './sponsors.ts'

const SPONSORS_URL = 'https://sponsors.napi.rs/sponsor.json'

// Shared sponsor fetch used by all three landing loaders (en/cn/pt-BR). Fetches
// the raw payload with a User-Agent and washes it into the tiered shape. On any
// failure (network, non-200, bad JSON) returns empty tiers so the page still
// renders. Pure-ish: no globals beyond `fetch`, safe to run in the worker SSR
// loader.
export async function loadSponsors(): Promise<WashedSponsors> {
  try {
    const res = await fetch(SPONSORS_URL, {
      headers: { 'User-Agent': 'napi-rs-website' },
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
