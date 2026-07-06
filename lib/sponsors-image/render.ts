// lib/sponsors-image/render.ts
// Orchestrates one sponsors-image response: inline avatars -> satori SVG -> (for
// PNG) resvg rasterize at 2x. Pure of any Hono/worker context so it is unit
// testable; the caller (route) supplies sponsors + fonts and has already run
// ensureYoga (and ensureResvg for PNG).

import type { WashedSponsors } from '../landing/sponsors.ts'
import type { SatoriFont } from './fonts.ts'
import type { Theme } from './theme.ts'
import { inlineSponsorAvatars, type ImageFetcher } from './avatars.ts'
import { renderSvg, CARD_WIDTH, capBackers } from './card.ts'
import { svgToPng } from './resvg.ts'

const PNG_SCALE = 2

export interface RenderOptions {
  format: 'svg' | 'png'
  theme: Theme
  sponsors: WashedSponsors
  fonts: SatoriFont[]
  fetchImage?: ImageFetcher
}

export interface RenderResult {
  body: string | Uint8Array
  contentType: string
}

export async function renderSponsorsImage(
  opts: RenderOptions,
): Promise<RenderResult> {
  const capped = capBackers(opts.sponsors)
  const inlined = await inlineSponsorAvatars(capped, opts.fetchImage)
  const svg = await renderSvg(inlined, opts.theme, opts.fonts)
  if (opts.format === 'svg') {
    return { body: svg, contentType: 'image/svg+xml; charset=utf-8' }
  }
  return {
    body: svgToPng(svg, CARD_WIDTH * PNG_SCALE),
    contentType: 'image/png',
  }
}
