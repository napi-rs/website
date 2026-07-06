// lib/sponsors-image/fonts.ts
// Load the Manrope TTFs the card needs, at runtime, from the worker's own static
// assets (public/fonts/*.ttf served via the ASSETS binding). satori has no system
// fonts and needs raw TTF/OTF buffers (not woff2). Cached per isolate so we read
// each font once. A failed load clears the cache so the next request can retry.

export interface SatoriFont {
  name: string
  data: ArrayBuffer
  weight: number
  style: 'normal'
}

export type AssetReader = (path: string) => Promise<ArrayBuffer>

export type AssetsFetcher = { fetch(input: URL): Promise<Response> }

let cache: Promise<SatoriFont[]> | null = null

export function loadFonts(read: AssetReader): Promise<SatoriFont[]> {
  if (!cache) {
    cache = load(read).catch((err) => {
      cache = null
      throw err
    })
  }
  return cache
}

async function load(read: AssetReader): Promise<SatoriFont[]> {
  const [bold, medium] = await Promise.all([
    read('/fonts/Manrope_700Bold.ttf'),
    read('/fonts/Manrope_500Medium.ttf'),
  ])
  return [
    { name: 'Manrope', data: bold, weight: 700, style: 'normal' },
    { name: 'Manrope', data: medium, weight: 500, style: 'normal' },
  ]
}

// Read a static asset (e.g. a font) from the worker's ASSETS binding. `path` is
// an absolute path like `/fonts/x.ttf`, resolved against the current request URL.
export function readAsset(
  assets: AssetsFetcher,
  baseUrl: string,
  path: string,
): Promise<ArrayBuffer> {
  return assets.fetch(new URL(path, baseUrl)).then((res) => {
    if (!res.ok) throw new Error(`asset ${path} failed: ${res.status}`)
    return res.arrayBuffer()
  })
}
