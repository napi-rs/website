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

export async function inlineSponsorAvatars(
  sponsors: WashedSponsors,
  fetchImage: ImageFetcher = DEFAULT_FETCH,
  timeoutMs: number = AVATAR_TIMEOUT_MS,
): Promise<WashedSponsors> {
  const result = {} as WashedSponsors
  for (const tier of TIERS) {
    const inlined = await Promise.all(
      sponsors[tier].map((s) => inlineOne(s, fetchImage, timeoutMs)),
    )
    result[tier] = inlined.filter((s): s is WashedSponsor => s !== null)
  }
  return result
}
