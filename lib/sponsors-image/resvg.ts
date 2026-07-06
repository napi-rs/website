// lib/sponsors-image/resvg.ts
// Rasterize an SVG string to PNG bytes with @resvg/resvg-wasm. Runs on the
// Cloudflare edge: the route passes the statically-imported wasm module (a real
// WebAssembly.Module) into ensureResvg once. The SVG paints its own background,
// so no resvg background option is needed; text is already vectorized by satori,
// so no fonts are needed here.

import { initWasm, Resvg } from '@resvg/resvg-wasm'

let resvgReady: Promise<void> | null = null

export function ensureResvg(wasm: WebAssembly.Module): Promise<void> {
  if (!resvgReady) {
    resvgReady = initWasm(wasm).catch((err) => {
      // initWasm throws if already initialized in this isolate — treat as ready.
      if (String(err).includes('Already initialized')) return
      resvgReady = null
      throw err
    })
  }
  return resvgReady
}

export function svgToPng(svg: string, width: number): Uint8Array {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
  return resvg.render().asPng()
}
