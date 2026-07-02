// Pure transform from the tier-keyed raw sponsor payload into the tiered
// `{ name, img, url }` shape that `components/landing/hooks/useSponsors`
// `mapSponsors` expects. Kept pure (no fetch, no globals) so it is trivially
// unit-testable and safe to run inside the worker SSR loader. The raw payload is
// built by `load-sponsors.ts` from the GitHub Sponsors GraphQL API.
//
// The raw payload is keyed by tier: specialThanks / platinum / gold / sliver /
// backers (the `sliver` misspelling is intentional and MUST be preserved —
// `mapSponsors` reads `sponsors['sliver']`). Each raw item is
// `{ login, name, avatarUrl }`; the sponsor link points at the GitHub profile
// (`https://github.com/<login>`).

export interface RawSponsor {
  login: string
  name: string
  avatarUrl: string
}

export interface WashedSponsor {
  name: string
  img: string
  url: string
}

export interface WashedSponsors {
  specialThanks: WashedSponsor[]
  platinum: WashedSponsor[]
  gold: WashedSponsor[]
  sliver: WashedSponsor[]
  backers: WashedSponsor[]
}

// The five tier keys, in the order `mapSponsors` consumes them. `sliver` is the
// upstream misspelling — do not "fix" it.
const TIERS = [
  'specialThanks',
  'platinum',
  'gold',
  'sliver',
  'backers',
] as const

function washTier(items: RawSponsor[] | undefined): WashedSponsor[] {
  if (!Array.isArray(items)) {
    return []
  }
  return items.map((item) => ({
    name: item.name,
    img: item.avatarUrl,
    url: `https://github.com/${item.login}`,
  }))
}

// Map the raw, possibly-partial payload into the tiered washed shape. Every tier
// key is always present as an array (defaults to `[]`) so downstream consumers
// can spread `sponsors[tier]` without guarding for missing keys. A falsy /
// non-object input (failed fetch) yields all-empty tiers.
export function wash(raw: unknown): WashedSponsors {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    RawSponsor[] | undefined
  >
  const washed = {} as WashedSponsors
  for (const tier of TIERS) {
    washed[tier] = washTier(source[tier])
  }
  return washed
}
