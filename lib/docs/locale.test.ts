// @vitest-environment node
//
// Unit tests for the pure locale helpers (lib/docs/locale.ts). No virtual
// module, no worker — pure string logic with the en-at-root / cn-prefixed
// asymmetry under test.
//
// Run: GITHUB_TOKEN=dummy vp test run lib/docs/locale.test.ts
import { describe, it, expect } from 'vite-plus/test'
import {
  getLocale,
  splitLocale,
  localizeHref,
  localeSectionIndex,
  DEFAULT_LOCALE,
} from './locale.ts'

describe('getLocale', () => {
  it('detects cn and pt-BR prefixes', () => {
    expect(getLocale('/cn/docs/concepts/class')).toBe('cn')
    expect(getLocale('/pt-BR/docs/cli/build')).toBe('pt-BR')
  })
  it('treats unprefixed paths as the default en locale', () => {
    expect(getLocale('/docs/concepts/enum')).toBe('en')
    expect(getLocale('/')).toBe('en')
    expect(getLocale('/blog/foo')).toBe('en')
  })
  it('does not treat en as a prefix segment', () => {
    // `en` is served at root; an explicit /en/... still reports en.
    expect(getLocale('/en/docs/concepts/enum')).toBe('en')
  })
  it('DEFAULT_LOCALE is en', () => {
    expect(DEFAULT_LOCALE).toBe('en')
  })
})

describe('splitLocale', () => {
  it('splits prefixed locales and strips the prefix from the remainder', () => {
    expect(splitLocale('/cn/docs/concepts/class')).toEqual([
      'cn',
      'docs/concepts/class',
    ])
    expect(splitLocale('/pt-BR/docs/cli/build')).toEqual([
      'pt-BR',
      'docs/cli/build',
    ])
  })
  it('keeps the full remainder for en (no prefix to strip)', () => {
    expect(splitLocale('/docs/concepts/enum')).toEqual([
      'en',
      'docs/concepts/enum',
    ])
  })
  it('handles bare locale roots', () => {
    expect(splitLocale('/cn')).toEqual(['cn', ''])
    expect(splitLocale('/')).toEqual(['en', ''])
  })
})

describe('localizeHref — en/non-en asymmetry', () => {
  it('drops the prefix for en', () => {
    expect(localizeHref('docs/concepts/class', 'en')).toBe(
      '/docs/concepts/class',
    )
    expect(localizeHref('docs', 'en')).toBe('/docs')
  })
  it('adds the prefix for cn and pt-BR', () => {
    expect(localizeHref('docs/concepts/class', 'cn')).toBe(
      '/cn/docs/concepts/class',
    )
    expect(localizeHref('docs/concepts/class', 'pt-BR')).toBe(
      '/pt-BR/docs/concepts/class',
    )
  })
  it('maps empty path to the locale root', () => {
    expect(localizeHref('', 'en')).toBe('/')
    expect(localizeHref('', 'cn')).toBe('/cn')
    expect(localizeHref('', 'pt-BR')).toBe('/pt-BR')
  })
  it('tolerates a leading slash on input', () => {
    expect(localizeHref('/docs/x', 'en')).toBe('/docs/x')
    expect(localizeHref('/docs/x', 'cn')).toBe('/cn/docs/x')
  })
})

describe('localeSectionIndex', () => {
  it('yields the docs section index per locale', () => {
    expect(localeSectionIndex('docs', 'en')).toBe('/docs')
    expect(localeSectionIndex('docs', 'cn')).toBe('/cn/docs')
    expect(localeSectionIndex('docs', 'pt-BR')).toBe('/pt-BR/docs')
  })
})
