// lib/sponsors-cache/store.ts
// KV + R2 cache for the sponsor list and rendered images. The list JSON and a
// manifest (mapping format:theme -> R2 object key) live in KV; the image bytes
// live in R2 under a per-version folder. writeSnapshot flips the manifest last
// (atomic pointer swap) and best-effort deletes the previous version's objects.

import type { WashedSponsors } from '../landing/sponsors.ts'

export type ImageFormat = 'svg' | 'png'
export type ImageTheme = 'light' | 'dark'

// Minimal structural bindings (avoids depending on @cloudflare/workers-types).
export interface KVStore {
  get(key: string, opts?: { type?: 'text' }): Promise<string | null>
  put(
    key: string,
    value: string,
    opts?: { expirationTtl?: number },
  ): Promise<void>
}
export interface R2Store {
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView,
    opts?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>
  delete(key: string | string[]): Promise<void>
}

export interface ImageEntry {
  key: string
  contentType: string
}
export interface SponsorsManifest {
  version: string
  updatedAt: string
  images: Record<string, ImageEntry>
}
export interface RenderedImage {
  format: ImageFormat
  theme: ImageTheme
  body: Uint8Array
  contentType: string
}

export const DATA_KEY = 'sponsors:data'
export const MANIFEST_KEY = 'sponsors:manifest'

export function imageSlot(format: ImageFormat, theme: ImageTheme): string {
  return `${format}:${theme}`
}

// Treat ANY cache-read failure — a rejected `kv.get` (transient KV error) or a
// corrupt/unparseable value — as a miss (null), so every caller falls through to
// its live/cold path instead of surfacing a 500.
export async function readManifest(
  kv: KVStore,
): Promise<SponsorsManifest | null> {
  try {
    const raw = await kv.get(MANIFEST_KEY, { type: 'text' })
    return raw ? (JSON.parse(raw) as SponsorsManifest) : null
  } catch {
    return null
  }
}

export async function readData(kv: KVStore): Promise<WashedSponsors | null> {
  try {
    const raw = await kv.get(DATA_KEY, { type: 'text' })
    return raw ? (JSON.parse(raw) as WashedSponsors) : null
  } catch {
    return null
  }
}

export async function readImage(
  kv: KVStore,
  r2: R2Store,
  format: ImageFormat,
  theme: ImageTheme,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const manifest = await readManifest(kv)
  const entry = manifest?.images[imageSlot(format, theme)]
  if (!entry) return null
  // A rejected R2 get / arrayBuffer (transient R2 error) is a cache miss too, so
  // the image routes fall through to a live cold render instead of 500ing.
  try {
    const obj = await r2.get(entry.key)
    if (!obj) return null
    return {
      body: new Uint8Array(await obj.arrayBuffer()),
      contentType: entry.contentType,
    }
  } catch {
    return null
  }
}

// Publish a snapshot with a compare-and-swap on the manifest pointer.
// `expectedVersion` is the manifest version the caller observed when it STARTED
// this refresh (null if the cache was cold). Rendering takes seconds, so a
// faster concurrent refresh may publish in the meantime; we upload our blobs
// (unique per-version keys, always safe), then re-read the manifest right before
// flipping and only publish if it still matches what we based this render on.
// If a DIFFERENT version was published while we rendered, a slower/staler writer
// must not roll the cache back — we abort and drop the blobs we just uploaded.
export async function writeSnapshot(
  kv: KVStore,
  r2: R2Store,
  data: WashedSponsors,
  version: string,
  images: RenderedImage[],
  expectedVersion: string | null,
): Promise<void> {
  // Stage the blobs under a per-render id so we NEVER overwrite the keys the live
  // manifest currently serves — even a forced same-version re-render (the daily
  // avatar refresh) writes a fresh folder. A partial write or an aborted CAS thus
  // can't corrupt or roll back the live cache; readers only ever follow the
  // manifest to a fully-written folder, which is published by the single atomic
  // manifest flip below.
  const renderId = crypto.randomUUID()
  const manifest: SponsorsManifest = {
    version,
    updatedAt: new Date().toISOString(),
    images: {},
  }
  for (const img of images) {
    const key = `sponsors/${version}/${renderId}/${img.format}-${img.theme}`
    await r2.put(key, img.body, {
      httpMetadata: { contentType: img.contentType },
    })
    manifest.images[imageSlot(img.format, img.theme)] = {
      key,
      contentType: img.contentType,
    }
  }

  // "CAS": re-read the pointer right before flipping. Abort if a concurrent
  // refresh moved it to a version other than the one we started from (and other
  // than our own content) — else a stale writer would roll the cache back.
  //
  // NOTE: Cloudflare KV has no atomic compare-and-swap / conditional put, so a
  // few-ms window between this read and the kv.put below cannot be closed at the
  // KV layer. Two refreshes that both start from the same manifest, fetch
  // DIFFERENT data, and both clear this check before either put can still let the
  // staler one publish last. That requires two refreshes overlapping within ~ms
  // (sources are a daily cron + rare webhooks + rare cold-warms) with changed
  // data in between, and it self-heals on the next refresh. True serialization
  // would need a Durable Object (or moving the manifest to R2 for an ETag
  // conditional write); both are disproportionate for a wall that refreshes
  // daily and on the odd sponsorship change. Deliberately accepted.
  const latest = await readManifest(kv)
  const latestVersion = latest?.version ?? null
  if (latestVersion !== expectedVersion && latestVersion !== version) {
    const ourKeys = Object.values(manifest.images).map((e) => e.key)
    if (ourKeys.length) await r2.delete(ourKeys).catch(() => {})
    return
  }

  await kv.put(DATA_KEY, JSON.stringify(data))
  await kv.put(MANIFEST_KEY, JSON.stringify(manifest))
  // Best-effort cleanup of the blobs the previous manifest referenced that our
  // freshly-staged folder does not (staging ids are unique, so a same-version
  // re-render still cleans up the old folder rather than leaking it).
  if (latest) {
    const ourKeys = new Set(Object.values(manifest.images).map((e) => e.key))
    const oldKeys = Object.values(latest.images)
      .map((e) => e.key)
      .filter((k) => !ourKeys.has(k))
    if (oldKeys.length) await r2.delete(oldKeys).catch(() => {})
  }
}
