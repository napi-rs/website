/// <reference lib="webworker" />
//
// DEPLOY REQUIREMENT — this module is bundled to a hashed `assets/worker-*.js` and spawned from the
// COEP:require-corp landing document. A dedicated worker created by a require-corp document is itself
// blocked unless its OWN response carries `Cross-Origin-Embedder-Policy: require-corp`. That header is
// set on `/assets/*` in void.json. BUT hashed-asset cache keys are unversioned and survive deploys (CF
// edge caches per content-encoding variant), so a no-COEP response cached before the header existed
// keeps being served to browsers even after the rule is added — the worker then spawns with `ONERROR`
// and the demo hangs. The only reliable fix is to mint a NEW asset hash so the URL has no stale cache
// history. The BUILD_TAG below changes the emitted bytes (a comment alone is stripped by minification
// and does NOT change the hash). Bump it whenever the COEP/serving story changes and a clean asset URL
// is needed.
import { Buffer } from 'buffer'
import type { Format, WorkerRequest, WorkerResponse } from './protocol'

// Names the worker thread (visible in devtools) AND, as a live side effect on `self`, survives
// minification — so editing BUILD_TAG mints a fresh `assets/worker-*.js` hash. See header note.
const BUILD_TAG = 'napi-website-image@coep-2026-06-18'
;(self as { name?: string }).name = BUILD_TAG

// @napi-rs/image's encoders return a Node Buffer; the emnapi runtime needs globalThis.Buffer defined
// BEFORE the dynamic import('@napi-rs/image'), or it throws NotSupportBufferError.
if (typeof (globalThis as { Buffer?: unknown }).Buffer === 'undefined') {
  ;(globalThis as { Buffer?: unknown }).Buffer = Buffer
}

type Mod = typeof import('@napi-rs/image')

function toArrayBuffer(out: Uint8Array): ArrayBuffer {
  // Copy into a FRESH regular ArrayBuffer. The wasm runs with threads, so its Memory is
  // `shared: true` and HEAPU8.buffer is a SharedArrayBuffer; if the returned Buffer views that heap,
  // `out.buffer.slice()` would yield another SharedArrayBuffer — which postMessage cannot TRANSFER.
  // Building a new ArrayBuffer and copying the bytes is transferable regardless of the source.
  const ab = new ArrayBuffer(out.byteLength)
  new Uint8Array(ab).set(out)
  return ab
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, format, quality, chroma, bytes } = e.data
  const post = (msg: WorkerResponse, transfer: Transferable[] = []) =>
    (self as unknown as Worker).postMessage(msg, transfer)
  try {
    const mod: Mod = await import('@napi-rs/image')
    const transformer = new mod.Transformer(new Uint8Array(bytes))
    let out: Uint8Array
    switch (format) {
      case 'webp':
        out = await transformer.webp(quality)
        break
      case 'avif':
        out = await transformer.avif({
          quality,
          alphaQuality: quality,
          chromaSubsampling: chroma,
        })
        break
      case 'jpeg':
        out = await transformer.jpeg(quality)
        break
    }
    const ab = toArrayBuffer(out as unknown as Uint8Array)
    post({ id, ok: true, bytes: ab, outFormat: format as Format }, [ab])
  } catch (err) {
    post({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
