// lib/sponsors-image/avatars.ts
// Fetch each sponsor avatar and inline it as a base64 data URI. Required because
// GitHub's Camo proxy blocks external <image href> in README SVGs, and the edge
// runtime / resvg cannot fetch external images while rasterizing. We request
// PNG/JPEG (satori & resvg can't decode WebP) and drop any avatar that fails.

import type { WashedSponsors, WashedSponsor } from '../landing/sponsors.ts'

const TIERS = [
  'specialThanks',
  'platinum',
  'gold',
  'sliver',
  'backers',
] as const

const AVATAR_TIMEOUT_MS = 3000

// Cloudflare Workers allow ~6 simultaneous outbound connections. Cap concurrent
// avatar fetches at that so a queued fetch doesn't burn its timeout while waiting
// for a slot — inlineOne (which starts the per-fetch timeout) only runs when a
// slot frees. https://developers.cloudflare.com/workers/platform/limits/#simultaneous-open-connections
export const AVATAR_CONCURRENCY = 6

export type ImageFetcher = (
  url: string,
  signal?: AbortSignal,
) => Promise<Response>

const DEFAULT_FETCH: ImageFetcher = (url, signal) =>
  fetch(url, {
    headers: { accept: 'image/png,image/jpeg;q=0.9,image/*;q=0.8' },
    signal,
  })

// Uint8Array -> base64 using btoa (available in workerd + Node). Chunked so a
// large avatar doesn't blow the argument-count limit of String.fromCharCode.
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// Append `s=120` for github avatar hosts to shrink the payload; leave other
// hosts untouched. Never throws — a malformed URL is returned as-is.
function sizedAvatarUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.endsWith('githubusercontent.com'))
      u.searchParams.set('s', '120')
    return u.toString()
  } catch {
    return url
  }
}

async function inlineOne(
  sponsor: WashedSponsor,
  fetchImage: ImageFetcher,
  timeoutMs: number,
): Promise<WashedSponsor | null> {
  try {
    const res = await fetchImage(
      sizedAvatarUrl(sponsor.img),
      AbortSignal.timeout(timeoutMs),
    )
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? ''
    if (!/^image\/(png|jpe?g|gif)/i.test(contentType)) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    return {
      ...sponsor,
      img: `data:${contentType};base64,${bytesToBase64(bytes)}`,
    }
  } catch {
    return null
  }
}

// Run `fn` over `items` with at most `limit` concurrent calls, preserving order.
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index])
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  )
  await Promise.all(workers)
  return results
}

export async function inlineSponsorAvatars(
  sponsors: WashedSponsors,
  fetchImage: ImageFetcher = DEFAULT_FETCH,
  timeoutMs: number = AVATAR_TIMEOUT_MS,
): Promise<WashedSponsors> {
  const flat: { tier: (typeof TIERS)[number]; sponsor: WashedSponsor }[] = []
  for (const tier of TIERS) {
    for (const sponsor of sponsors[tier]) flat.push({ tier, sponsor })
  }
  const inlined = await mapLimit(flat, AVATAR_CONCURRENCY, (item) =>
    inlineOne(item.sponsor, fetchImage, timeoutMs),
  )
  const result: WashedSponsors = {
    specialThanks: [],
    platinum: [],
    gold: [],
    sliver: [],
    backers: [],
  }
  flat.forEach((item, i) => {
    const one = inlined[i]
    if (one) result[item.tier].push(one)
  })
  return result
}
