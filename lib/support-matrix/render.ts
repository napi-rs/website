// lib/support-matrix/render.ts
// Orchestrates one support-matrix response: MatrixModel -> satori SVG -> (for
// PNG) resvg rasterize at 2x. Pure of any Hono/worker context so it stays
// unit-testable; the caller (route) supplies the model + fonts + the statically
// imported wasm modules. Reuses the sponsors resvg plumbing unchanged.

import { ensureResvg, svgToPng } from '../sponsors-image/resvg.ts'
import type { SatoriFont } from '../sponsors-image/fonts.ts'
import type { MatrixModel } from './resolve.ts'
import type { ThemeName } from './theme.ts'
import { renderSvg, CARD_WIDTH } from './card.ts'

const PNG_SCALE = 2

export interface RenderMatrixArgs {
  format: 'svg' | 'png'
  theme: ThemeName
  model: MatrixModel
  fonts: SatoriFont[]
  yogaWasm: WebAssembly.Module
  // Required only for PNG output.
  resvgWasm?: WebAssembly.Module
}

export interface RenderMatrixResult {
  body: string | Uint8Array
  contentType: string
}

export async function renderMatrix(
  args: RenderMatrixArgs,
): Promise<RenderMatrixResult> {
  const svg = await renderSvg(args.model, {
    theme: args.theme,
    fonts: args.fonts,
    yogaWasm: args.yogaWasm,
  })
  if (args.format === 'svg') {
    return { body: svg, contentType: 'image/svg+xml; charset=utf-8' }
  }
  if (!args.resvgWasm) {
    throw new Error('renderMatrix: resvgWasm is required for PNG output')
  }
  await ensureResvg(args.resvgWasm)
  return {
    body: svgToPng(svg, CARD_WIDTH * PNG_SCALE),
    contentType: 'image/png',
  }
}
