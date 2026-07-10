// lib/support-matrix/theme.ts
// Light/dark palettes for the support-matrix image. Two solid-background
// variants so the badge stays legible on both light and dark README surfaces
// (GitHub / npm / crates). Mirrors `lib/sponsors-image/theme.ts` in spirit but
// adds the three status-tier colors (green / amber / gray) the matrix needs.
// Pure data — no satori / wasm dependency — so it stays plain-vitest testable.

import type { Tier } from './resolve.ts'

export type ThemeName = 'light' | 'dark'

// A single status tier's colors: a colored border + colored text sitting on a
// faint tinted background, so a chip reads as a rounded "pill".
export interface TierColor {
  text: string
  border: string
  bg: string
}

export interface Palette {
  // The outer rounded panel that wraps the three cards.
  pageBg: string
  // Each inner card.
  cardBg: string
  cardBorder: string
  // Strong text (headlines) and muted text (labels / subtitles / legends).
  text: string
  muted: string
  // The small uppercase section label above each card headline.
  label: string
  // A subtle "code" surface for the `engines:` line.
  codeBg: string
  codeText: string
  // The three status tiers, keyed by the resolve-model `Tier`.
  tiers: Record<Tier, TierColor>
}

const PALETTES: Record<ThemeName, Palette> = {
  light: {
    pageBg: '#ffffff',
    cardBg: '#f8fafc',
    cardBorder: '#e2e8f0',
    text: '#0f172a',
    muted: '#64748b',
    label: '#94a3b8',
    codeBg: '#eef2f6',
    codeText: '#334155',
    tiers: {
      tested: {
        text: '#15803d',
        border: 'rgba(34, 197, 94, 0.55)',
        bg: 'rgba(34, 197, 94, 0.12)',
      },
      nonblocking: {
        text: '#b45309',
        border: 'rgba(245, 158, 11, 0.55)',
        bg: 'rgba(245, 158, 11, 0.14)',
      },
      untested: {
        text: '#64748b',
        border: 'rgba(100, 116, 139, 0.40)',
        bg: 'rgba(100, 116, 139, 0.08)',
      },
    },
  },
  dark: {
    pageBg: '#0b0d10',
    cardBg: '#111418',
    cardBorder: '#1f2937',
    text: '#f8fafc',
    muted: '#94a3b8',
    label: '#64748b',
    codeBg: '#0f1319',
    codeText: '#cbd5e1',
    tiers: {
      tested: {
        text: '#4ade80',
        border: 'rgba(34, 197, 94, 0.45)',
        bg: 'rgba(34, 197, 94, 0.12)',
      },
      nonblocking: {
        text: '#fbbf24',
        border: 'rgba(245, 158, 11, 0.45)',
        bg: 'rgba(245, 158, 11, 0.12)',
      },
      untested: {
        text: '#94a3b8',
        border: 'rgba(148, 163, 184, 0.35)',
        bg: 'rgba(148, 163, 184, 0.10)',
      },
    },
  },
}

export function palette(theme: ThemeName): Palette {
  return PALETTES[theme]
}
