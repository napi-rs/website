// @vitest-environment node
//
// Unit test for the pure i18n fallback decision (lib/i18n/fallback.ts).
// Pure-data: feeds a hand-built known-page set so it runs without the Void
// pipeline or the `@void/md/pages` virtual module.
//
// Run: GITHUB_TOKEN=dummy vp test run lib/i18n/fallback.test.ts
import { describe, it, expect } from 'vite-plus/test'
import {
  decideFallback,
  isFallbackOriginal,
  islandKnownPaths,
  FALLBACK_LOCALES,
  DEFAULT_LOCALE,
} from './fallback.ts'

// A representative slice of the real emitted route set: en has every page;
// cn is missing cli/build and concepts/env; pt-BR has cli/build but not env.
const KNOWN = new Set<string>([
  '/en/docs/concepts/enum',
  '/en/docs/concepts/class',
  '/en/docs/concepts/env',
  '/en/docs/cli/build',
  '/cn/docs/concepts/class',
  '/cn/docs/concepts/enum',
  '/pt-BR/docs/cli/build',
  '/pt-BR/docs/concepts/class',
])

describe('decideFallback', () => {
  it('falls back to en when a cn page is missing but en exists', () => {
    const d = decideFallback('/cn/docs/cli/build', KNOWN)
    expect(d.fallback).toBe(true)
    expect(d.destination).toBe('/en/docs/cli/build')
    expect(d.locale).toBe('cn')
  })

  it('falls back to en when a pt-BR page is missing but en exists', () => {
    const d = decideFallback('/pt-BR/docs/concepts/env', KNOWN)
    expect(d.fallback).toBe(true)
    expect(d.destination).toBe('/en/docs/concepts/env')
    expect(d.locale).toBe('pt-BR')
  })

  it('does NOT fall back when the cn page exists (direct serve)', () => {
    const d = decideFallback('/cn/docs/concepts/class', KNOWN)
    expect(d.fallback).toBe(false)
    expect(d.destination).toBeUndefined()
  })

  it('does NOT fall back when the pt-BR page exists (direct serve)', () => {
    const d = decideFallback('/pt-BR/docs/cli/build', KNOWN)
    expect(d.fallback).toBe(false)
  })

  it('does NOT fall back when neither locale nor en has the page (real 404)', () => {
    const d = decideFallback('/cn/docs/does/not/exist', KNOWN)
    expect(d.fallback).toBe(false)
    expect(d.destination).toBeUndefined()
  })

  it('never rewrites en requests (en is the default, served at root)', () => {
    const d = decideFallback('/en/docs/concepts/enum', KNOWN)
    expect(d.fallback).toBe(false)
  })

  it('passes through unknown / unhandled locale prefixes', () => {
    // `/fr/…` is not a managed locale — leave it for the router to 404.
    const d = decideFallback('/fr/docs/concepts/enum', KNOWN)
    expect(d.fallback).toBe(false)
  })

  it('passes through the bare locale root with no sub-page', () => {
    expect(decideFallback('/cn', KNOWN).fallback).toBe(false)
    expect(decideFallback('/pt-BR', KNOWN).fallback).toBe(false)
  })

  it('passes through the site root', () => {
    expect(decideFallback('/', KNOWN).fallback).toBe(false)
  })

  it('ignores API routes', () => {
    expect(decideFallback('/api/anything', KNOWN).fallback).toBe(false)
    expect(decideFallback('/api', KNOWN).fallback).toBe(false)
  })

  it('ignores Void internal routes', () => {
    expect(decideFallback('/__void/whatever', KNOWN).fallback).toBe(false)
  })

  it('ignores static asset requests even under a locale prefix', () => {
    // A missing cn asset must not be rewritten to an en page.
    expect(decideFallback('/cn/docs/hero.png', KNOWN).fallback).toBe(false)
    expect(decideFallback('/cn/styles/app.css', KNOWN).fallback).toBe(false)
    expect(decideFallback('/pt-BR/data.json', KNOWN).fallback).toBe(false)
  })

  it('tolerates a trailing slash on a fallback-eligible page', () => {
    const d = decideFallback('/cn/docs/cli/build/', KNOWN)
    expect(d.fallback).toBe(true)
    expect(d.destination).toBe('/en/docs/cli/build')
  })

  it('exposes the expected locale + default-locale constants', () => {
    expect(FALLBACK_LOCALES).toEqual(['cn', 'pt-BR'])
    expect(DEFAULT_LOCALE).toBe('en')
  })
})

describe('isFallbackOriginal', () => {
  it('is true when a cn page fell back to the en equivalent', () => {
    expect(isFallbackOriginal('/cn/docs/cli/build', '/en/docs/cli/build')).toBe(
      true,
    )
  })

  it('is true when a pt-BR page fell back to the en equivalent', () => {
    expect(
      isFallbackOriginal('/pt-BR/docs/concepts/env', '/en/docs/concepts/env'),
    ).toBe(true)
  })

  it('tolerates a trailing slash on the original path', () => {
    expect(
      isFallbackOriginal('/cn/docs/cli/build/', '/en/docs/cli/build'),
    ).toBe(true)
  })

  it('is false for a static en-at-root rewrite (/docs/* -> /en/docs/*)', () => {
    // The original here is the unprefixed `/docs/…`, not a fallback locale.
    expect(isFallbackOriginal('/docs/cli/build', '/en/docs/cli/build')).toBe(
      false,
    )
  })

  it('is false when the rest paths differ (not a like-for-like fallback)', () => {
    expect(isFallbackOriginal('/cn/docs/cli/build', '/en/docs/cli/new')).toBe(
      false,
    )
  })

  it('is false when current is not the default locale', () => {
    expect(
      isFallbackOriginal('/cn/docs/cli/build', '/pt-BR/docs/cli/build'),
    ).toBe(false)
  })

  it('is false when neither path is locale-prefixed', () => {
    expect(isFallbackOriginal('/', '/en')).toBe(false)
  })
})

describe('islandKnownPaths', () => {
  it('locale-prefixes each unprefixed island leaf', () => {
    expect(
      islandKnownPaths({
        en: ['changelog/napi', 'changelog/napi-cli'],
        cn: [],
        'pt-BR': [],
      }),
    ).toEqual(['/en/changelog/napi', '/en/changelog/napi-cli'])
  })

  it('tolerates a leading slash on the leaf (no double slash)', () => {
    expect(islandKnownPaths({ en: ['/changelog/napi'] })).toEqual([
      '/en/changelog/napi',
    ])
  })

  it('returns [] when no locale has island leaves', () => {
    expect(islandKnownPaths({ en: [], cn: [], 'pt-BR': [] })).toEqual([])
  })

  // The reason islandKnownPaths exists: unioned into the known-page set, a
  // markdown-less changelog island now falls back like a markdown page — a
  // `/cn/changelog/*` request rewrites to the en island instead of 404ing.
  it('makes a changelog island fall back once unioned into knownPaths', () => {
    const known = new Set<string>([
      '/en/docs/concepts/enum', // some markdown page
      ...islandKnownPaths({ en: ['changelog/napi'], cn: [], 'pt-BR': [] }),
    ])
    expect(decideFallback('/cn/changelog/napi', known)).toEqual({
      fallback: true,
      destination: '/en/changelog/napi',
      locale: 'cn',
    })
    // Without the island union it would NOT fall back (en path unknown) → 404.
    expect(
      decideFallback('/cn/changelog/napi', new Set(['/en/docs/concepts/enum']))
        .fallback,
    ).toBe(false)
  })
})
