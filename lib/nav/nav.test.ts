// @vitest-environment node
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vite-plus/test'
import { nav, locales } from './index.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const legacyPages = join(__dirname, '..', '..', 'legacy_pages')

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

  it('docs sidebar preserves group order from _meta (introduction first)', () => {
    // introduction should always be the first docs group across all locales
    for (const locale of ['en', 'cn', 'pt-BR'] as const) {
      const docsGroups = nav[locale].sidebar.docs
      expect(docsGroups[0].group, `${locale} first group`).toBe('introduction')
    }
    // en and pt-BR have 'more' as the last group (cn omits it — no cn content files in more/)
    expect(nav.en.sidebar.docs[nav.en.sidebar.docs.length - 1].group).toBe(
      'more',
    )
    expect(
      nav['pt-BR'].sidebar.docs[nav['pt-BR'].sidebar.docs.length - 1].group,
    ).toBe('more')
  })

  it('no dangling leaves — every leaf has a content file (localized or en fallback)', () => {
    for (const [locale, localeNav] of Object.entries(nav)) {
      for (const [_section, groups] of Object.entries(localeNav.sidebar)) {
        for (const group of groups) {
          for (const leaf of group.items) {
            const base = join(legacyPages, leaf.path)
            const localized =
              existsSync(`${base}.${locale}.mdx`) ||
              existsSync(`${base}.${locale}.md`)
            // The docs sidebar is derived from the EN structure for every
            // locale, so cn/pt-BR intentionally surface leaves that are not
            // translated yet; those render the EN page through the i18n
            // fallback middleware (middleware/02.i18n-fallback.ts). A leaf is
            // only dangling if NEITHER the localized nor the EN source exists.
            const enFallback =
              existsSync(`${base}.en.mdx`) || existsSync(`${base}.en.md`)
            expect(
              localized || enFallback,
              `dangling leaf: legacy_pages/${leaf.path} has neither ${locale} nor en source`,
            ).toBe(true)
          }
        }
      }
    }
  })
})
