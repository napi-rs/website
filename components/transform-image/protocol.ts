// components/transform-image/protocol.ts
// Message contract between the UI island and the encode worker, plus a numeric
// mirror of @napi-rs/image's ChromaSubsampling enum. This file imports NOTHING
// from @napi-rs/image so the island/UI bundle never pulls the wasm module — the
// worker is the only thing that dynamically imports it.
export const ChromaSubsampling = {
  Yuv444: 0,
  Yuv422: 1,
  Yuv420: 2,
  Yuv400: 3,
} as const

export type Format = 'webp' | 'avif' | 'jpeg'

export type WorkerRequest = {
  id: number
  format: Format
  quality: number
  chroma: number
  bytes: ArrayBuffer
}

export type WorkerResponse =
  | { id: number; ok: true; bytes: ArrayBuffer; outFormat: Format }
  | { id: number; ok: false; error: string }

export const OUTPUT_MIME: Record<Format, string> = {
  webp: 'image/webp',
  avif: 'image/avif',
  jpeg: 'image/jpeg',
}
