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
const MAX_BACKERS = 100

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
  if (!yogaReady) yogaReady = init(wasm)
  return yogaReady
}

// satori node helpers (avoids a JSX runtime; matches the spike-verified shape).
type Node = { type: string; props: Record<string, unknown> }

function avatar(sponsor: WashedSponsor, size: number): Node {
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
        marginRight: 8,
        marginBottom: 8,
      },
    },
  }
}

function tierSection(
  spec: TierSpec,
  list: WashedSponsor[],
  t: ThemeTokens,
): Node {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'column', marginTop: 20 },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: t.muted,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: 1,
              marginBottom: 10,
            },
            children: spec.label,
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexWrap: 'wrap' },
            children: list.map((s) => avatar(s, spec.size)),
          },
        },
      ],
    },
  }
}

function header(t: ThemeTokens): Node {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        borderBottom: `1px solid ${t.border}`,
        paddingBottom: 16,
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: t.fg,
              fontSize: 30,
              fontWeight: 700,
            },
            children: 'NAPI-RS Sponsors',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: t.accent,
              fontSize: 15,
              fontWeight: 500,
              marginTop: 4,
            },
            children: 'napi.rs',
          },
        },
      ],
    },
  }
}

export function renderSvg(
  sponsors: WashedSponsors,
  theme: Theme,
  fonts: SatoriFont[],
): Promise<string> {
  const t = THEMES[theme]
  const sections = TIER_SPECS.map((spec) => ({
    spec,
    list:
      spec.key === 'backers'
        ? sponsors[spec.key].slice(0, MAX_BACKERS)
        : sponsors[spec.key],
  }))
    .filter(({ list }) => list.length > 0)
    .map(({ spec, list }) => tierSection(spec, list, t))

  const root: Node = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: t.bg,
        padding: 40,
        fontFamily: 'Manrope',
      },
      children: [header(t), ...sections],
    },
  }

  // satori accepts plain {type,props} nodes as ReactNode; cast keeps TS happy.
  return satori(root as unknown as Parameters<typeof satori>[0], {
    width: CARD_WIDTH,
    fonts,
  })
}
