// Pure, unit-testable i18n fallback decision logic.
//
// The companion middleware (middleware/02.i18n-fallback.ts) wires this to the
// live route set from `@void/md/pages` and calls `c.rewrite()`. Keeping the
// decision here — with the known-page set passed in — means it is testable
// without booting the worker or resolving the `@void/md/pages` virtual module
// (which is not registered under Vitest; see vite.config.ts `isVitest`).

/** Non-default locales that physically live under `/<locale>/…` route dirs. */
export const FALLBACK_LOCALES = ['cn', 'pt-BR'] as const
export type FallbackLocale = (typeof FALLBACK_LOCALES)[number]

/** The default locale served at the root via void.json rewrites. */
export const DEFAULT_LOCALE = 'en'

// File extensions we must never treat as a page (assets served in front of the
// worker — c.rewrite() into these throws VoidAssetRewriteError anyway, but we
// bail earlier and cheaper). Matched on the final path segment.
const ASSET_EXT_RE =
  /\.(png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|cjs|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|pdf|txt|xml|json|wasm|map|html)$/i

export interface FallbackDecision {
  /** Whether the request should be rewritten to the en equivalent. */
  fallback: boolean
  /** The `/en/…` destination to rewrite to, only set when `fallback` is true. */
  destination?: string
  /** The requested non-default locale, when the path is locale-prefixed. */
  locale?: FallbackLocale
}

const PASS: FallbackDecision = { fallback: false }

/** Strip a single trailing slash, keeping the root "/". */
function trimTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

/** Split `/<locale>/<rest>` into `[locale, rest]`, or null if not prefixed. */
function splitLocale(path: string): [string, string] | null {
  const slash = path.indexOf('/', 1)
  if (slash === -1) return null
  return [path.slice(1, slash), path.slice(slash)]
}

/** True for a leading-slash path that ends in a known static-asset extension. */
function looksLikeAsset(pathname: string): boolean {
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1)
  return ASSET_EXT_RE.test(lastSegment)
}

/**
 * Decide whether a request under `/cn/…` or `/pt-BR/…` should silently fall
 * back to the `/en/…` page (URL unchanged), matching Nextra's old behaviour.
 *
 * @param pathname    The incoming request pathname (leading slash, no query).
 * @param knownPaths  Set of emitted route paths (leading slash), e.g. the
 *                    `path` values from `@void/md/pages`
 *                    (`/en/docs/concepts/enum`, `/cn/docs/concepts/class`, …).
 * @returns           A decision: pass through, or fall back to a `/en/…` path.
 */
export function decideFallback(
  pathname: string,
  knownPaths: ReadonlySet<string>,
): FallbackDecision {
  // Normalise a single trailing slash (but keep the root "/").
  const path = trimTrailingSlash(pathname)

  // Never touch non-page requests: API routes, Void internals, assets.
  if (path.startsWith('/api/') || path === '/api') return PASS
  if (path.startsWith('/__void')) return PASS
  if (looksLikeAsset(path)) return PASS

  // Must be `/<locale>/<rest>` for a non-default locale.
  const split = splitLocale(path)
  if (!split) return PASS // e.g. "/cn" alone — no sub-page to map
  const [locale, rest] = split // rest keeps its leading slash, e.g. "/docs/cli/build"
  if (!FALLBACK_LOCALES.includes(locale as FallbackLocale)) return PASS

  // The requested locale already has this page — serve it directly.
  if (knownPaths.has(path)) return PASS

  // Fall back only when the en equivalent actually exists.
  const enPath = `/${DEFAULT_LOCALE}${rest}`
  if (knownPaths.has(enPath)) {
    return {
      fallback: true,
      destination: enPath,
      locale: locale as FallbackLocale,
    }
  }

  // Neither locale nor en has it — let the router 404 naturally.
  return PASS
}

/**
 * On a re-dispatched (rewritten) request, decide whether the rewrite was an
 * i18n fallback — i.e. the user asked for a non-default-locale page that wasn't
 * translated, and we are now rendering the matching `/en/…` page.
 *
 * This distinguishes our fallback from the static `routing.rewrites`
 * (`/docs/* -> /en/docs/:splat`) which also marks the request as rewritten: for
 * those, the ORIGINAL path was already unprefixed (`/docs/…`), not `/cn` or
 * `/pt-BR`, so this returns false.
 *
 * @param originalPathname  The pre-rewrite pathname (from `c.originalUrl()`).
 * @param currentPathname   The re-dispatched pathname (`c.req.path`).
 */
export function isFallbackOriginal(
  originalPathname: string,
  currentPathname: string,
): boolean {
  const original = splitLocale(trimTrailingSlash(originalPathname))
  const current = splitLocale(trimTrailingSlash(currentPathname))
  if (!original || !current) return false
  const [originalLocale, originalRest] = original
  const [currentLocale, currentRest] = current
  return (
    FALLBACK_LOCALES.includes(originalLocale as FallbackLocale) &&
    currentLocale === DEFAULT_LOCALE &&
    originalRest === currentRest
  )
}
