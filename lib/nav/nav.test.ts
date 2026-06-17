// @vitest-environment node
import { describe, it, expect } from 'vite-plus/test'
import { nav, locales } from './index.ts'

describe('nav manifest', () => {
  it('has all three locales with non-empty tabs and docs sidebar', () => {
    for (const locale of ['en', 'cn', 'pt-BR'] as const) {
      const n = nav[locale]
      expect(n.tabs.length, `${locale} tabs`).toBeGreaterThan(0)
      expect(n.sidebar.docs, `${locale} docs sidebar`).toBeDefined()
      expect(
        n.sidebar.docs.length,
        `${locale} docs sidebar groups`,
      ).toBeGreaterThan(0)
    }
  })

  it('every leaf has a non-empty title and path', () => {
    for (const [locale, localeNav] of Object.entries(nav)) {
      for (const [section, groups] of Object.entries(localeNav.sidebar)) {
        for (const group of groups) {
          for (const leaf of group.items) {
            expect(
              leaf.title,
              `${locale}/${section}/${group.group} leaf title`,
            ).toBeTruthy()
            expect(
              leaf.path,
              `${locale}/${section}/${group.group} leaf path`,
            ).toBeTruthy()
          }
        }
      }
    }
  })

  it('no duplicate paths within a section', () => {
    for (const [locale, localeNav] of Object.entries(nav)) {
      for (const [section, groups] of Object.entries(localeNav.sidebar)) {
        const paths = groups.flatMap((g) => g.items.map((l) => l.path))
        const unique = new Set(paths)
        expect(
          unique.size,
          `${locale}/${section} has duplicate paths: ${paths.filter((p, i) => paths.indexOf(p) !== i).join(', ')}`,
        ).toBe(paths.length)
      }
    }
  })

  it('locales array has all three with correct display labels', () => {
    expect(locales).toHaveLength(3)
    const map = Object.fromEntries(locales.map((l) => [l.locale, l.text]))
    expect(map['en']).toBe('English')
    expect(map['cn']).toBe('简体中文')
    expect(map['pt-BR']).toBe('Português do Brasil')
  })

  it('every tab has a non-empty key and title', () => {
    for (const [locale, localeNav] of Object.entries(nav)) {
      for (const tab of localeNav.tabs) {
        expect(tab.key, `${locale} tab key`).toBeTruthy()
        expect(tab.title, `${locale} tab title`).toBeTruthy()
      }
    }
  })

  it('docs sidebar preserves group order from _meta (introduction first, more last)', () => {
    // introduction should always be the first docs group across all locales
    for (const locale of ['en', 'cn', 'pt-BR'] as const) {
      const docsGroups = nav[locale].sidebar.docs
      expect(docsGroups[0].group).toBe('introduction')
      // 'more' should be the last group
      expect(docsGroups[docsGroups.length - 1].group).toBe('more')
    }
  })
})
