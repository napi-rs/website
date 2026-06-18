// i18n fallback middleware.
//
// When a page is requested under a non-default locale (`/cn/…`, `/pt-BR/…`)
// that has NOT been translated yet, but the English page DOES exist, silently
// serve the English content with the URL unchanged — matching Nextra's old
// behaviour — and flag it so the (future, T7) layout can render a
// "not translated yet" banner.
//
// `en` itself is served at the root via void.json `routing.rewrites`
// (`/docs/* -> /en/docs/:splat`, …); those static rewrites run at the edge
// BEFORE this middleware, so by the time we run, en requests already carry an
// `/en/…` pathname and are never a fallback locale.
//
// Control flow (verified against node_modules/void/dist — `c.rewrite()`
// re-dispatches a fresh Request through the whole middleware stack via
// app.fetch, and the page render reads `c.get("shared")` on the *re-dispatched*
// context — see void/dist/pages/protocol.mjs):
//
//   1. Original pass (`/cn/docs/cli/build`, not rewritten): decideFallback()
//      says "missing in cn, present in en" → c.rewrite("/en/docs/cli/build").
//   2. Re-dispatched pass (`/en/docs/cli/build`, c.isRewritten() === true,
//      c.originalUrl() === "…/cn/docs/cli/build"): this is the pass that
//      actually renders the page, so we set `shared.i18nFallback` HERE — that
//      is the context handlePageGet() reads. We also stamp an observable
//      `x-i18n-fallback` response header after next() (the original pass's
//      response is discarded by c.rewrite, so the header must be set on the
//      re-dispatched response that is returned to the client).
//
// The pure decision logic lives in lib/i18n/fallback.ts so it can be unit
// tested without booting the worker or resolving `@void/md/pages`.

import { defineMiddleware } from 'void'
import mdPages from '@void/md/pages'
import { decideFallback, isFallbackOriginal } from '../lib/i18n/fallback.ts'

// Shared data surfaced to pages/layouts via `useShared()` from the framework
// adapter. `i18nFallback` is set here; `path` (the public route path) is set by
// 03.page-path.ts. This augmentation is the single source of truth for the
// `shared` shape — both middlewares must agree on it (TS merges declarations and
// errors on a divergent re-declaration).
declare module 'void' {
  interface CloudContextVariables {
    shared: { i18nFallback?: boolean; path?: string }
  }
}

// Memoise the known-page Set against the `@void/md/pages` array identity. The
// virtual module is HMR-aware in dev (new array on change) and frozen in prod,
// so rebuilding only when the reference changes keeps it both cheap and fresh.
let cachedSource: ReadonlyArray<{ path: string }> | undefined
let cachedSet: ReadonlySet<string> | undefined
function knownPaths(): ReadonlySet<string> {
  if (cachedSet && cachedSource === mdPages) return cachedSet
  cachedSource = mdPages
  cachedSet = new Set(mdPages.map((p) => p.path))
  return cachedSet
}

export default defineMiddleware(async (c, next) => {
  // Only GET/HEAD navigations can be page fallbacks.
  const method = c.req.method
  if (method !== 'GET' && method !== 'HEAD') return next()

  // Re-dispatched pass: this is the context that renders the page. If we got
  // here because a non-en locale page fell back to en, set the shared flag (so
  // useShared().i18nFallback is true for the layout) and stamp the response.
  if (c.isRewritten()) {
    const original = c.originalUrl()
    if (original && isFallbackOriginal(original.pathname, c.req.path)) {
      c.set('shared', { ...(c.get('shared') ?? {}), i18nFallback: true })
      await next()
      c.header('x-i18n-fallback', '1')
      return
    }
    return next()
  }

  // Original pass: decide whether to fall back to the en page.
  const decision = decideFallback(c.req.path, knownPaths())
  if (!decision.fallback || !decision.destination) return next()

  // Re-dispatch to the en equivalent (URL stays the same in the browser).
  // The re-dispatched pass above handles the flag + header on the response
  // that c.rewrite returns to the client.
  return c.rewrite(decision.destination)
})
