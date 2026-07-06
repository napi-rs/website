// Theme tokens for the sponsors card. Two solid-background variants so the
// image is legible on both light and dark README surfaces (GitHub/npm/crates).
// `?theme=dark` opts into the dark variant; anything else is light.

export type Theme = 'light' | 'dark'

export interface ThemeTokens {
  bg: string
  fg: string
  muted: string
  accent: string
  border: string
}

export const THEMES: Record<Theme, ThemeTokens> = {
  light: {
    bg: '#ffffff',
    fg: '#0f172a',
    muted: '#64748b',
    accent: '#e66000',
    border: '#e2e8f0',
  },
  dark: {
    bg: '#0b0d10',
    fg: '#f8fafc',
    muted: '#94a3b8',
    accent: '#f97316',
    border: '#1f2937',
  },
}

export function parseTheme(value: string | null | undefined): Theme {
  return value === 'dark' ? 'dark' : 'light'
}
