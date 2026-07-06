// lib/sponsors-image/card.ts
// Build the sponsor-wall card with satori (React-less: plain {type,props} nodes)
// and render it to an SVG string. satori embeds fonts as vector <path> and inlined
// avatars as base64 <image>, so the SVG is fully self-contained (Camo-safe) and
// resvg needs no fonts to rasterize it. Uses the `satori/standalone` entry so we
// control yoga init explicitly (required on the Cloudflare edge).

import satori, { init } from 'satori/standalone'
import type { WashedSponsors, WashedSponsor } from '../landing/sponsors.ts'
import type { SatoriFont } from './fonts.ts'
import { THEMES, type Theme, type ThemeTokens } from './theme.ts'

export const CARD_WIDTH = 800

// Bound the backers row so a large tier can't explode avatar fan-out / image height.
export const MAX_BACKERS = 100

// Cap the backers tier BEFORE avatar fetching, so an oversized list can't fan
// out hundreds of avatar fetches on the edge (a resource bound, not just layout).
export function capBackers(sponsors: WashedSponsors): WashedSponsors {
  if (sponsors.backers.length <= MAX_BACKERS) return sponsors
  return { ...sponsors, backers: sponsors.backers.slice(0, MAX_BACKERS) }
}

interface TierSpec {
  key: keyof WashedSponsors
  label: string
  size: number
}

const TIER_SPECS: TierSpec[] = [
  { key: 'specialThanks', label: 'SPECIAL THANKS', size: 64 },
  { key: 'platinum', label: 'PLATINUM', size: 64 },
  { key: 'gold', label: 'GOLD', size: 48 },
  { key: 'sliver', label: 'SILVER', size: 36 },
  { key: 'backers', label: 'BACKERS', size: 28 },
]

let yogaReady: Promise<void> | null = null

export function ensureYoga(wasm: WebAssembly.Module): Promise<void> {
  if (!yogaReady) {
    yogaReady = init(wasm).catch((err) => {
      yogaReady = null
      throw err
    })
  }
  return yogaReady
}

// satori node helpers (avoids a JSX runtime; matches the spike-verified shape).
type Node = { type: string; props: Record<string, unknown> }

function avatar(sponsor: WashedSponsor, size: number, t: ThemeTokens): Node {
  return {
    type: 'img',
    props: {
      src: sponsor.img,
      width: size,
      height: size,
      style: {
        width: size,
        height: size,
        borderRadius: size / 2,
        // Faint ring so a logo matching the background still reads as present.
        border: `1px solid ${t.ring}`,
        // Symmetric horizontal margins so a centred, wrapping row stays centred.
        marginLeft: 6,
        marginRight: 6,
        marginBottom: 12,
      },
    },
  }
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// satori strips <a> wrappers (it targets static images), so we wrap the rendered
// avatars ourselves: each self-closing <image> is one avatar, emitted in the same
// order as `urls`, so wrap the Nth in an SVG <a> to the Nth sponsor's page. Makes
// sponsors clickable when the .svg is opened directly; README `![]()` embeds still
// render as a flat image (anchors are ignored there).
function linkAvatars(svg: string, urls: string[]): string {
  let i = 0
  return svg.replace(/<image[^>]*\/>/g, (image) => {
    const url = urls[i++]
    return url
      ? `<a href="${escapeXmlAttr(url)}" target="_blank" rel="noopener">${image}</a>`
      : image
  })
}

// A centred tier label flanked by two short rules — "── SPECIAL THANKS ──".
function tierLabel(label: string, t: ThemeTokens): Node {
  const rule = (side: 'left' | 'right'): Node => ({
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: 24,
        height: 1,
        background: t.border,
        [side === 'left' ? 'marginRight' : 'marginLeft']: 14,
      },
    },
  })
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
      },
      children: [
        rule('left'),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: t.muted,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 2.5,
            },
            children: label,
          },
        },
        rule('right'),
      ],
    },
  }
}

function tierSection(
  spec: TierSpec,
  list: WashedSponsor[],
  t: ThemeTokens,
  first: boolean,
): Node {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        marginTop: first ? 0 : 40,
      },
      children: [
        tierLabel(spec.label, t),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
            },
            children: list.map((s) => avatar(s, spec.size, t)),
          },
        },
      ],
    },
  }
}

export async function renderSvg(
  sponsors: WashedSponsors,
  theme: Theme,
  fonts: SatoriFont[],
): Promise<string> {
  const t = THEMES[theme]
  const rendered = TIER_SPECS.map((spec) => ({
    spec,
    list: sponsors[spec.key],
  })).filter(({ list }) => list.length > 0)
  const sections = rendered.map(({ spec, list }, i) =>
    tierSection(spec, list, t, i === 0),
  )
  // Same order the avatars are emitted in, so linkAvatars can pair them 1:1.
  const urls = rendered.flatMap(({ list }) => list.map((s) => s.url))

  const root: Node = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: t.bg,
        paddingTop: 48,
        paddingBottom: 52,
        paddingLeft: 48,
        paddingRight: 48,
        fontFamily: 'Manrope',
      },
      children: sections,
    },
  }

  // satori accepts plain {type,props} nodes as ReactNode; cast keeps TS happy.
  const svg = await satori(root as unknown as Parameters<typeof satori>[0], {
    width: CARD_WIDTH,
    fonts,
  })
  return linkAvatars(svg, urls)
}
