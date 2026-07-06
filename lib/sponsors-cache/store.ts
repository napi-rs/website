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

export async function readManifest(
  kv: KVStore,
): Promise<SponsorsManifest | null> {
  const raw = await kv.get(MANIFEST_KEY, { type: 'text' })
  if (!raw) return null
  try {
    return JSON.parse(raw) as SponsorsManifest
  } catch {
    return null
  }
}

export async function readData(kv: KVStore): Promise<WashedSponsors | null> {
  const raw = await kv.get(DATA_KEY, { type: 'text' })
  if (!raw) return null
  try {
    return JSON.parse(raw) as WashedSponsors
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
  const obj = await r2.get(entry.key)
  if (!obj) return null
  return {
    body: new Uint8Array(await obj.arrayBuffer()),
    contentType: entry.contentType,
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
  const manifest: SponsorsManifest = {
    version,
    updatedAt: new Date().toISOString(),
    images: {},
  }
  for (const img of images) {
    const key = `sponsors/${version}/${img.format}-${img.theme}`
    await r2.put(key, img.body, {
      httpMetadata: { contentType: img.contentType },
    })
    manifest.images[imageSlot(img.format, img.theme)] = {
      key,
      contentType: img.contentType,
    }
  }

  // CAS: re-read the pointer right before flipping. Abort if a concurrent
  // refresh moved it to a version other than the one we started from (and other
  // than our own content) — else a stale writer would roll the cache back.
  const latest = await readManifest(kv)
  const latestVersion = latest?.version ?? null
  if (latestVersion !== expectedVersion && latestVersion !== version) {
    const ourKeys = Object.values(manifest.images).map((e) => e.key)
    if (ourKeys.length) await r2.delete(ourKeys).catch(() => {})
    return
  }

  await kv.put(DATA_KEY, JSON.stringify(data))
  await kv.put(MANIFEST_KEY, JSON.stringify(manifest))
  // Best-effort cleanup of the version we just replaced (`latest`, which the CAS
  // confirmed we own the transition from).
  if (latest && latest.version !== version) {
    const oldKeys = Object.values(latest.images).map((e) => e.key)
    if (oldKeys.length) await r2.delete(oldKeys).catch(() => {})
  }
}
