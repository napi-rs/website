// lib/support-matrix/card.ts
// Build the support-matrix badge with satori (React-less: plain {type,props}
// nodes) and render it to a self-contained SVG string. satori embeds the
// Manrope fonts as vector <path>, so the SVG needs no fonts to rasterize with
// resvg. Uses the `satori/standalone` entry so we control the yoga init
// explicitly (required on the Cloudflare edge). Mirrors the structure of
// `lib/sponsors-image/card.ts` (ensureYoga memo + node-tree helpers).

import satori, { init } from 'satori/standalone'
import type { SatoriFont } from '../sponsors-image/fonts.ts'
import type { MatrixModel, OsSection, Chip, Tier } from './resolve.ts'
import type { NodeModel } from './node.ts'
import {
  palette,
  type ThemeName,
  type Palette,
  type TierColor,
} from './theme.ts'

// Re-export so Task 3's route can type the fonts identically to the sponsors
// route (both renderers consume the exact same font shape).
export type { SatoriFont } from '../sponsors-image/fonts.ts'

// Fixed render width; satori derives the height from the content.
export const CARD_WIDTH = 900

let yogaReady: Promise<void> | null = null

// Memoize the (global, per-isolate) yoga init. Mirrors sponsors' ensureYoga so
// a failed init clears the cache and the next call retries.
export function ensureYoga(wasm: WebAssembly.Module): Promise<void> {
  if (!yogaReady) {
    yogaReady = init(wasm).catch((err) => {
      yogaReady = null
      throw err
    })
  }
  return yogaReady
}

// satori node helpers (avoids a JSX runtime; matches the sponsors shape).
type Node = { type: string; props: Record<string, unknown> }

// A leaf text node: a flex div carrying a single string child. satori wants an
// explicit display on every element, so every helper sets `display: flex`.
function text(value: string, style: Record<string, unknown>): Node {
  return {
    type: 'div',
    props: { style: { display: 'flex', ...style }, children: value },
  }
}

// Wrap a raw SVG string as an inline data-URI <img>. The most portable satori
// path — no reliance on satori's own SVG element support, and resvg rasterizes
// the nested SVG fine. Manrope has no icon glyphs, so every icon is drawn here.
function svgImg(svg: string, size: number, marginRight = 0): Node {
  return {
    type: 'img',
    props: {
      width: size,
      height: size,
      src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      style: { display: 'flex', width: size, height: size, marginRight },
    },
  }
}

// A filled status circle with a white checkmark.
function statusIcon(fill: string, size: number): Node {
  return svgImg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">` +
      `<circle cx="12" cy="12" r="11" fill="${fill}"/>` +
      `<path d="M7 12.4l3.2 3.2L17 8.8" fill="none" stroke="#ffffff" stroke-width="2.4" ` +
      `stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    size,
  )
}

// An amber warning triangle with an exclamation (Manrope has no ⚠ glyph).
function warnIcon(fill: string, size: number): Node {
  return svgImg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">` +
      `<path d="M12 3.2 L22.4 21 L1.6 21 Z" fill="${fill}"/>` +
      `<rect x="11" y="9" width="2" height="6" rx="1" fill="#ffffff"/>` +
      `<circle cx="12" cy="17.8" r="1.15" fill="#ffffff"/></svg>`,
    size,
    8,
  )
}

// One rounded status pill: colored border + colored text on a faint tint.
function chip(label: string, tier: Tier, p: Palette): Node {
  const c: TierColor = p.tiers[tier]
  return text(label, {
    color: c.text,
    background: c.bg,
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    fontSize: 15,
    fontWeight: 500,
    marginRight: 8,
    marginBottom: 8,
    whiteSpace: 'nowrap',
  })
}

// A horizontal run of chips that wraps.
function chipRow(chips: Node[]): Node {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
      },
      children: chips,
    },
  }
}

// A small colored dot followed by a label — one legend entry.
function legendItem(dotColor: string, label: string, p: Palette): Node {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        marginRight: 22,
        marginBottom: 4,
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              width: 9,
              height: 9,
              borderRadius: 5,
              background: dotColor,
              marginRight: 7,
            },
          },
        },
        text(label, { color: p.muted, fontSize: 13, fontWeight: 500 }),
      ],
    },
  }
}

function legendRow(items: Node[]): Node {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: 18,
      },
      children: items,
    },
  }
}

// The uppercase section label above a card headline.
function sectionLabel(value: string, p: Palette): Node {
  return text(value.toUpperCase(), {
    color: p.label,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    marginBottom: 12,
  })
}

// Headline row: a status icon followed by the big headline text.
function headline(icon: Node, value: string, p: Palette): Node {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', alignItems: 'center', marginBottom: 6 },
      children: [
        {
          ...icon,
          props: {
            ...icon.props,
            style: { ...(icon.props.style as object), marginRight: 12 },
          },
        },
        text(value, {
          color: p.text,
          fontSize: 30,
          fontWeight: 700,
          lineHeight: 1.1,
        }),
      ],
    },
  }
}

function subtitle(value: string, p: Palette): Node {
  return text(value, {
    color: p.muted,
    fontSize: 15,
    fontWeight: 500,
    marginBottom: 16,
  })
}

// The package title above the whole card stack — a notch larger/bolder than a
// card headline (fontSize 30 / weight 700) so the badge leads with the name.
function titleRow(value: string, p: Palette): Node {
  return text(value, {
    color: p.text,
    fontSize: 34,
    fontWeight: 700,
    lineHeight: 1.1,
    marginBottom: 20,
  })
}

// One card container (rounded, bordered). `first` drops the top margin.
function card(children: Node[], p: Palette, first: boolean): Node {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        background: p.cardBg,
        border: `1px solid ${p.cardBorder}`,
        borderRadius: 16,
        paddingTop: 24,
        paddingBottom: 24,
        paddingLeft: 28,
        paddingRight: 28,
        marginTop: first ? 0 : 20,
      },
      children,
    },
  }
}

// ── Node.js card ──────────────────────────────────────────────────────────
function nodeCard(node: NodeModel, p: Palette, first: boolean): Node {
  const green = p.tiers.tested
  const gray = p.tiers.untested
  const children: Node[] = [
    sectionLabel('Node.js', p),
    headline(statusIcon(green.text, 26), node.headline, p),
  ]
  if (node.enginesRaw) {
    children.push(
      text(`engines: ${node.enginesRaw}`, {
        color: p.codeText,
        background: p.codeBg,
        borderRadius: 6,
        paddingTop: 3,
        paddingBottom: 3,
        paddingLeft: 8,
        paddingRight: 8,
        fontSize: 14,
        fontWeight: 500,
        marginBottom: 8,
        alignSelf: 'flex-start',
      }),
    )
  }
  if (node.excluded) {
    children.push(
      text(`Node ${node.excluded} are excluded.`, {
        color: p.muted,
        fontSize: 14,
        fontWeight: 500,
        marginBottom: 12,
      }),
    )
  }
  if (node.pills.length) {
    const pills = node.pills.map((pill) => {
      const label = `${pill.floor ?? pill.major}${pill.floor ? '+' : ''}`
      return chip(label, pill.tested ? 'tested' : 'untested', p)
    })
    children.push(chipRow(pills))
  }
  children.push(
    legendRow([
      legendItem(green.text, 'tested in CI', p),
      legendItem(gray.text, 'supported, not in the CI matrix', p),
    ]),
  )
  return card(children, p, first)
}

// ── Platforms card ────────────────────────────────────────────────────────
function osRow(section: OsSection, p: Palette): Node {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', alignItems: 'flex-start', marginBottom: 4 },
      children: [
        text(section.os, {
          color: p.text,
          fontSize: 15,
          fontWeight: 700,
          width: 108,
          flexShrink: 0,
          marginTop: 4,
        }),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexWrap: 'wrap',
              flexGrow: 1,
              flexShrink: 1,
            },
            children: section.chips.map((ch: Chip) =>
              chip(ch.label, ch.tier, p),
            ),
          },
        },
      ],
    },
  }
}

function tierCounts(sections: OsSection[]): Record<Tier, number> {
  const counts: Record<Tier, number> = {
    tested: 0,
    nonblocking: 0,
    untested: 0,
  }
  for (const s of sections) for (const c of s.chips) counts[c.tier] += 1
  return counts
}

function platformsCard(
  sections: OsSection[],
  p: Palette,
  first: boolean,
): Node {
  const counts = tierCounts(sections)
  const total = counts.tested + counts.nonblocking + counts.untested
  const iconColor =
    counts.tested > 0 ? p.tiers.tested.text : p.tiers.untested.text
  const children: Node[] = [
    sectionLabel('Platforms', p),
    headline(statusIcon(iconColor, 26), `${total} native targets, prebuilt`, p),
    subtitle('No node-gyp, no toolchain, no postinstall step.', p),
    ...sections.map((s) => osRow(s, p)),
    legendRow([
      legendItem(p.tiers.tested.text, `CI-tested (${counts.tested})`, p),
      legendItem(
        p.tiers.nonblocking.text,
        `non-blocking (${counts.nonblocking})`,
        p,
      ),
      legendItem(
        p.tiers.untested.text,
        `built, untested (${counts.untested})`,
        p,
      ),
    ]),
  ]
  return card(children, p, first)
}

// ── Browser card ──────────────────────────────────────────────────────────
function browserCard(chips: Chip[], p: Palette, first: boolean): Node {
  const primary: Chip = chips[0] ?? { label: 'wasm32-wasi', tier: 'untested' }
  const iconColor = p.tiers[primary.tier].text
  const children: Node[] = [
    sectionLabel('Browser', p),
    headline(statusIcon(iconColor, 26), primary.label, p),
    subtitle(
      'Bundlers pick the wasm build via the browser export condition.',
      p,
    ),
    chipRow(chips.map((ch) => chip(ch.label, ch.tier, p))),
    {
      type: 'div',
      props: {
        style: { display: 'flex', alignItems: 'center', marginTop: 14 },
        children: [
          warnIcon(p.tiers.nonblocking.text, 16),
          text(
            'Requires cross-origin isolation (COOP + COEP) for SharedArrayBuffer.',
            { color: p.muted, fontSize: 13, fontWeight: 500 },
          ),
        ],
      },
    },
  ]
  return card(children, p, first)
}

export async function renderSvg(
  model: MatrixModel,
  opts: { theme: ThemeName; fonts: SatoriFont[]; yogaWasm: WebAssembly.Module },
): Promise<string> {
  await ensureYoga(opts.yogaWasm)
  const p = palette(opts.theme)

  // Assemble only the cards that have content; `first` tracks the top card so
  // its margin collapses. Never throws on a null node / empty platforms /
  // null browser — those cards are simply skipped.
  const cards: Node[] = []
  const push = (make: (first: boolean) => Node) =>
    cards.push(make(cards.length === 0))
  if (model.node) push((first) => nodeCard(model.node!, p, first))
  if (model.platforms.length) {
    push((first) => platformsCard(model.platforms, p, first))
  }
  if (model.browser)
    push((first) => browserCard(model.browser!.chips, p, first))

  // The title sits above the card stack when `name` is set; the first card keeps
  // its collapsed top margin, so the title's own marginBottom is the only gap.
  const children: Node[] = model.name
    ? [titleRow(model.name, p), ...cards]
    : cards

  const root: Node = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: p.pageBg,
        paddingTop: 28,
        paddingBottom: 28,
        paddingLeft: 28,
        paddingRight: 28,
        fontFamily: 'Manrope',
      },
      children,
    },
  }

  // satori accepts plain {type,props} nodes as ReactNode; cast keeps TS happy.
  return satori(root as unknown as Parameters<typeof satori>[0], {
    width: CARD_WIDTH,
    fonts: opts.fonts,
  })
}
