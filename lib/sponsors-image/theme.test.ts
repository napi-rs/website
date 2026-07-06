import { describe, it, expect } from 'vitest'
import { parseTheme, THEMES } from './theme.ts'

describe('parseTheme', () => {
  it('defaults to light for missing/unknown values', () => {
    expect(parseTheme(undefined)).toBe('light')
    expect(parseTheme(null)).toBe('light')
    expect(parseTheme('')).toBe('light')
    expect(parseTheme('LIGHT')).toBe('light')
    expect(parseTheme('purple')).toBe('light')
  })
  it('returns dark only for exactly "dark"', () => {
    expect(parseTheme('dark')).toBe('dark')
  })
})

describe('THEMES', () => {
  it('has light and dark token sets with all keys', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const key of ['bg', 'fg', 'muted', 'accent', 'border'] as const) {
        expect(THEMES[theme][key]).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
    expect(THEMES.light.bg).not.toBe(THEMES.dark.bg)
  })
  it('has a non-empty ring token per theme (avatar outline)', () => {
    for (const theme of ['light', 'dark'] as const) {
      expect(typeof THEMES[theme].ring).toBe('string')
      expect(THEMES[theme].ring.length).toBeGreaterThan(0)
    }
  })
})
