// Pure, unit-testable locale helpers for the docs theme.
//
// Routing model (decided in the migration plan, enforced by void.json):
//   • `en` is the DEFAULT locale and is served at the ROOT. A `.md` page that
//     physically lives at `pages/en/docs/concepts/enum.md` (so its
//     `@void/md/pages` entry path is `/en/docs/concepts/enum`) is reachable in
//     the browser at `/docs/concepts/enum` via the void.json rewrite
//     `/docs/* -> /en/docs/:splat`.
//   • `cn` and `pt-BR` are NON-default locales served under their own prefix:
//     `/cn/docs/…`, `/pt-BR/docs/…`. No rewrite collapses the prefix.
//
// This asymmetry — en hrefs are UNPREFIXED, cn/pt-BR hrefs are PREFIXED — is the
// single most error-prone thing in the theme, so it lives here, pure and tested.
//
// Two distinct "path" spaces exist; do not confuse them:
//   • ROUTE / href: what goes in an <a href> and what `useRouter().path`
//     reports — en: `/docs/…`, cn: `/cn/docs/…`.
//   • md-page path: the locale-prefixed `path` on `@void/md/pages` entries —
//     ALWAYS `/<locale>/…` (`/en/docs/…`, `/cn/docs/…`). See lib/docs/page-data.ts.

import type { Locale } from '../nav/index.ts'

export const DEFAULT_LOCALE: Locale = 'en'

/** Non-default locales that live under an explicit `/<locale>/…` URL prefix. */
export const PREFIXED_LOCALES = ['cn', 'pt-BR'] as const

export type { Locale }

/**
 * Derive the active locale from a router/request pathname.
 *
 * `path` is a ROUTE pathname (leading slash). The first segment is the locale
 * only when it is a non-default prefixed locale; everything else (including
 * `/docs/…`, `/`, `/blog/…`) is the default `en`.
 *
 *   getLocale('/cn/docs/concepts/class') === 'cn'
 *   getLocale('/pt-BR/docs/cli/build')   === 'pt-BR'
 *   getLocale('/docs/concepts/enum')     === 'en'
 *   getLocale('/')                       === 'en'
 */
export function getLocale(path: string): Locale {
  const seg = path.split('/')[1]
  return seg === 'cn' || seg === 'pt-BR' ? seg : DEFAULT_LOCALE
}

/**
 * Split a ROUTE pathname into `[locale, rest]` where `rest` is the
 * locale-independent remainder WITHOUT a leading slash.
 *
 *   splitLocale('/cn/docs/concepts/class') === ['cn', 'docs/concepts/class']
 *   splitLocale('/docs/concepts/enum')     === ['en', 'docs/concepts/enum']
 *   splitLocale('/cn')                     === ['cn', '']
 *   splitLocale('/')                       === ['en', '']
 */
export function splitLocale(path: string): [Locale, string] {
  const locale = getLocale(path)
  // Strip leading slash, then strip the locale prefix segment for cn / pt-BR.
  let rest = path.replace(/^\/+/, '')
  if (locale !== DEFAULT_LOCALE) {
    rest = rest.slice(locale.length).replace(/^\/+/, '')
  }
  return [locale, rest]
}

/**
 * Build a ROUTE href for an UNPREFIXED path (e.g. a `lib/nav` leaf `path` such
 * as `docs/concepts/class`) in the given locale.
 *
 * The en/non-en asymmetry lives here:
 *   localizeHref('docs/concepts/class', 'en')    === '/docs/concepts/class'
 *   localizeHref('docs/concepts/class', 'cn')    === '/cn/docs/concepts/class'
 *   localizeHref('docs/concepts/class', 'pt-BR') === '/pt-BR/docs/concepts/class'
 *   localizeHref('', 'cn')                        === '/cn'
 *   localizeHref('docs', 'en')                    === '/docs'
 *
 * A leading slash on the input is tolerated and normalised.
 */
export function localizeHref(unprefixedPath: string, locale: Locale): string {
  const clean = unprefixedPath.replace(/^\/+/, '')
  if (locale === DEFAULT_LOCALE) {
    return clean ? `/${clean}` : '/'
  }
  return clean ? `/${locale}/${clean}` : `/${locale}`
}

/**
 * The href of a locale's docs section index — the fallback target when a page
 * does not exist in the locale we are switching TO.
 *
 *   localeSectionIndex('docs', 'en')    === '/docs'
 *   localeSectionIndex('docs', 'cn')    === '/cn/docs'
 *   localeSectionIndex('docs', 'pt-BR') === '/pt-BR/docs'
 */
export function localeSectionIndex(section: string, locale: Locale): string {
  return localizeHref(section, locale)
}

/**
 * The BCP-47 `<html lang>` value for a locale. Used by middleware/01.head.ts to
 * override the void.json `lang` default per ROUTE locale.
 *
 *   htmlLang('en')    === 'en'
 *   htmlLang('cn')    === 'zh-CN'   (cn is our internal key for Simplified Chinese)
 *   htmlLang('pt-BR') === 'pt-BR'
 */
export function htmlLang(locale: Locale): string {
  return locale === 'cn' ? 'zh-CN' : locale
}
