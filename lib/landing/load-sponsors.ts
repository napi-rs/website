import { env } from 'void/env'
import { logger } from 'void/log'

import { wash, type RawSponsor, type WashedSponsors } from './sponsors.ts'

// The landing sponsor wall is sourced LIVE from the GitHub Sponsors GraphQL API
// (was: the pre-baked sponsors.napi.rs/sponsor.json). We read the maintainer
// sponsors of the `napi-rs` ORG ONLY — the wall represents sponsors of the
// project, not any individual maintainer's personal account — bucket them into
// the site's tier ladder, and wash them into the `{ name, img, url }` shape the
// UI consumes.
//
// Requires a CLASSIC PAT in `GITHUB_TOKEN` with `read:org` + `read:user`.
// Fine-grained tokens CANNOT read the Sponsors API (tier data comes back
// FORBIDDEN/null) — see the `sponsors-need-classic-pat` note.

const GITHUB_GRAPHQL = 'https://api.github.com/graphql'

// The sponsorable org whose maintainer-sponsors make up the wall.
const ORG_LOGIN = 'napi-rs'

// Hand-curated entry prepended to the GitHub-derived tiers (mirrors the upstream
// sponsors.svg generator) — VoidZero is not a GitHub sponsor tier.
const SPECIAL_THANKS_LOGIN = 'voidzero-dev'

// Logins force-hidden from the auto tiers:
//   - voidzero-dev  -> rendered under Special Thanks, must not also double-up
//   - ArrayZoneYour -> upstream-excluded
//   - web-infra-dev -> no longer sponsors the project; a past sponsorship still
//                      surfaces via the live Sponsors API, so hide it explicitly
const EXCLUDED_LOGINS = new Set([
  SPECIAL_THANKS_LOGIN,
  'ArrayZoneYour',
  'web-infra-dev',
])

// Tier thresholds (monthly USD), matching the upstream sponsors.svg generator:
//   platinum >= 1000 | gold >= 200 | sliver >= 10 (recurring only) | backers = rest
const PLATINUM_MIN = 1000
const GOLD_MIN = 200
const SLIVER_MIN = 10

// Hard deadline. The landing loaders run per request (prerender=false,
// revalidate=0 so the COEP/COOP headers apply), so an unbounded GitHub fetch
// would hang the whole SSR response. On timeout/any error we degrade to empty
// tiers and the page still renders.
const FETCH_TIMEOUT_MS = 4000

// In-isolate cache: the data changes slowly but the landing page is per-request,
// so without this every hit would call GitHub. Lives for the worker isolate.
const CACHE_TTL_MS = 10 * 60 * 1000
let cache: { value: WashedSponsors; expiresAt: number } | null = null

interface SponsorEntity {
  __typename: string
  login: string
  name: string | null
  avatarUrl: string
}

interface SponsorshipNode {
  privacyLevel: string
  tier: { monthlyPriceInDollars: number; isOneTime: boolean } | null
  sponsorEntity: SponsorEntity | null
}

const SPONSOR_FIELDS = `
    pageInfo { hasNextPage }
    nodes {
      privacyLevel
      tier { monthlyPriceInDollars isOneTime }
      sponsorEntity {
        __typename
        ... on User { login name avatarUrl }
        ... on Organization { login name avatarUrl }
      }
    }`

// `includePrivate: false` -> only PUBLIC sponsorships are returned, so private
// sponsors are never exposed on the public wall. `first: 100` covers the current
// count comfortably; if it ever exceeds 100 the overflow is logged (not silently
// dropped) rather than paginated on the per-request hot path.
const QUERY = `{
  org: organization(login: "${ORG_LOGIN}") {
    sponsorshipsAsMaintainer(first: 100, includePrivate: false) {${SPONSOR_FIELDS}
    }
  }
  special: organization(login: "${SPECIAL_THANKS_LOGIN}") {
    __typename
    login
    name
    avatarUrl
  }
}`

function toRaw(entity: SponsorEntity): RawSponsor {
  return {
    login: entity.login,
    name: entity.name || entity.login,
    avatarUrl: entity.avatarUrl,
  }
}

interface Merged {
  entity: SponsorEntity
  monthly: number
  oneTime: boolean
}

// Bucket the org's public sponsorships into the four GitHub-derived tiers. The
// `byLogin` map de-dupes defensively (a login should appear at most once) and
// keeps the higher monthly amount if a duplicate ever shows up.
function bucket(nodes: SponsorshipNode[]): {
  platinum: RawSponsor[]
  gold: RawSponsor[]
  sliver: RawSponsor[]
  backers: RawSponsor[]
} {
  const byLogin = new Map<string, Merged>()
  for (const node of nodes) {
    const entity = node.sponsorEntity
    if (!entity || node.privacyLevel !== 'PUBLIC') continue
    if (EXCLUDED_LOGINS.has(entity.login)) continue
    const monthly = node.tier?.monthlyPriceInDollars ?? 0
    const prev = byLogin.get(entity.login)
    if (!prev || monthly > prev.monthly) {
      byLogin.set(entity.login, {
        entity,
        monthly,
        oneTime: node.tier?.isOneTime ?? false,
      })
    }
  }

  const platinum: RawSponsor[] = []
  const gold: RawSponsor[] = []
  const sliver: RawSponsor[] = []
  const backers: RawSponsor[] = []
  for (const { entity, monthly, oneTime } of byLogin.values()) {
    const raw = toRaw(entity)
    if (monthly >= PLATINUM_MIN) platinum.push(raw)
    else if (monthly >= GOLD_MIN) gold.push(raw)
    else if (monthly >= SLIVER_MIN && !oneTime) sliver.push(raw)
    else backers.push(raw)
  }
  return { platinum, gold, sliver, backers }
}

// Shared sponsor loader used by all three landing loaders (en/cn/pt-BR). On any
// failure (no token, network, non-200, GraphQL error, timeout) returns empty
// tiers so the landing page still renders — a broken wall never 500s the page.
export async function loadSponsors(options?: {
  bypassCache?: boolean
}): Promise<WashedSponsors> {
  if (!options?.bypassCache && cache && cache.expiresAt > Date.now()) {
    return cache.value
  }

  const token = env.GITHUB_TOKEN
  if (!token) {
    // The Sponsors API requires auth; without a token there is nothing to show.
    return wash({})
  }

  try {
    const res = await fetch(GITHUB_GRAPHQL, {
      method: 'POST',
      headers: {
        'User-Agent': 'napi-rs-website',
        'Content-Type': 'application/json',
        Authorization: `bearer ${token}`,
      },
      body: JSON.stringify({ query: QUERY }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) {
      logger.error('sponsors: GitHub GraphQL responded non-200', {
        status: res.status,
      })
      return wash({})
    }

    const body = (await res.json()) as {
      data?: {
        org?: {
          sponsorshipsAsMaintainer?: {
            pageInfo?: { hasNextPage?: boolean }
            nodes?: SponsorshipNode[]
          }
        }
        special?: SponsorEntity | null
      }
      errors?: unknown
    }
    if (body.errors) {
      logger.error('sponsors: GitHub GraphQL errors', {
        errors: JSON.stringify(body.errors),
      })
      return wash({})
    }

    const org = body.data?.org?.sponsorshipsAsMaintainer
    if (org?.pageInfo?.hasNextPage) {
      logger.warn(
        'sponsors: >100 sponsorships; overflow dropped (add pagination)',
      )
    }

    const tiers = bucket(org?.nodes ?? [])
    const special = body.data?.special
    const specialThanks: RawSponsor[] = special ? [toRaw(special)] : []

    const value = wash({ specialThanks, ...tiers })
    cache = { value, expiresAt: Date.now() + CACHE_TTL_MS }
    return value
  } catch (err) {
    logger.error('sponsors: failed to load from GitHub', {
      error: err instanceof Error ? err.message : String(err),
    })
    return wash({})
  }
}
