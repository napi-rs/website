// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { neutralPath, localeUrl, selfCanonical, BASE_URL } from './urls.ts'

describe('neutralPath', () => {
  it('strips the locale segment, keeps a leading slash, no trailing slash', () => {
    expect(neutralPath('/')).toBe('/')
    expect(neutralPath('/docs/x')).toBe('/docs/x')
    expect(neutralPath('/en/docs/x')).toBe('/docs/x')
    expect(neutralPath('/cn/docs/x')).toBe('/docs/x')
    expect(neutralPath('/pt-BR/blog/y')).toBe('/blog/y')
    expect(neutralPath('/cn')).toBe('/')
  })
})

describe('localeUrl', () => {
  it('renders en at root and others prefixed', () => {
    expect(localeUrl('/', 'en')).toBe('https://napi.rs/')
    expect(localeUrl('/docs/x', 'en')).toBe('https://napi.rs/docs/x')
    expect(localeUrl('/docs/x', 'cn')).toBe('https://napi.rs/cn/docs/x')
    expect(localeUrl('/', 'cn')).toBe('https://napi.rs/cn')
    expect(localeUrl('/blog/y', 'pt-BR')).toBe('https://napi.rs/pt-BR/blog/y')
  })
})

describe('selfCanonical', () => {
  it('returns the real served URL (en unprefixed, others prefixed)', () => {
    expect(selfCanonical('/')).toBe('https://napi.rs/')
    expect(selfCanonical('/docs/x')).toBe('https://napi.rs/docs/x')
    expect(selfCanonical('/en/docs/x')).toBe('https://napi.rs/docs/x')
    expect(selfCanonical('/cn/docs/x')).toBe('https://napi.rs/cn/docs/x')
  })
  it('BASE_URL has no trailing slash', () => {
    expect(BASE_URL).toBe('https://napi.rs')
  })
})
