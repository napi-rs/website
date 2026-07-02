// Page-path middleware.
//
// WHY THIS EXISTS: the docs chrome has STATIC (non-island) components —
// Breadcrumb, Pager, EditOnGithub — that need the current ROUTE path to derive
// the active leaf. They cannot read it from `useRouter()`: the Void island
// renderer SSRs pages WITHOUT a RouterContext (see
// node_modules/@void/react/dist/plugin.mjs `renderIslandPage`: "No
// RouterContext — islands have no Void Router"), so `useRouter().path` is the
// SSR proxy default `"/"` for any component that does not hydrate. Since these
// components are static by design (zero JS), they never get a client router
// either. So we surface the public route path through `useShared()` — which IS
// wired into the SSR render tree — and the per-locale docs layout passes it down
// as the `currentPath` prop.
//
// PUBLIC PATH DERIVATION (verified empirically against `void dev`):
//   • en at root      `/docs/x`      -> reqpath `/en/docs/x`, rewritten, originalUrl `/docs/x`
//   • cn direct        `/cn/docs/x`  -> reqpath `/cn/docs/x`, NOT rewritten
//   • pt-BR direct     `/pt-BR/...`  -> reqpath `/pt-BR/...`, NOT rewritten
//   • cn i18n-fallback `/cn/docs/y`  -> reqpath `/en/docs/y`, rewritten, originalUrl `/cn/docs/y`
// => publicPath = rewritten ? originalUrl.pathname : reqpath. This yields the
//    exact pathname `useRouter().path` reports client-side, which is what the
//    `lib/docs/locale` + `lib/docs/page-data` helpers expect.
//
// Runs after 02.i18n-fallback so the i18n re-dispatch has already settled and
// `c.originalUrl()` reflects the user-facing URL on the rendering pass.

// The `shared` shape (`{ i18nFallback?: boolean; path?: string }`) is augmented
// once in 02.i18n-fallback.ts — both fields live there so the declaration does
// not diverge between modules.
import { defineMiddleware } from 'void'

export default defineMiddleware(async (c, next) => {
  const method = c.req.method
  if (method !== 'GET' && method !== 'HEAD') return next()

  const original = c.isRewritten() ? c.originalUrl() : undefined
  const publicPath = original ? original.pathname : c.req.path

  c.set('shared', { ...(c.get('shared') ?? {}), path: publicPath })
  return next()
})
