// Accept-header content negotiation — serve raw markdown to AI agents.
//
// Convention: https://acceptmarkdown.com/start — "one URL, two representations".
// An agent that asks for `text/markdown` ahead of `text/html` on a normal page
// URL (e.g. `GET /docs/cli/build`, `Accept: text/markdown`) gets the raw
// markdown source; browsers, crawlers, and `curl` (which send `text/html` or
// `*/*`) get HTML exactly as before. No new URL shape — the existing
// build-emitted `/…​.md` static files are reused as the markdown source, so the
// dedicated `/docs/x.md` URLs keep working too.
//
// Why this is the FIRST middleware (`00.`): a markdown hit short-circuits the
// chain by returning a Response, so the head/og-tag rewrite (01), i18n rewrite
// (02) and page-path (03) middlewares are skipped — none of them are wanted on a
// raw-markdown response. On the HTML branch we simply `next()` and the rest of
// the chain runs untouched.
//
// Control flow (verified against node_modules/void/dist + .void/entry.ts):
//   • `run_worker_first: ["/**"]` — this worker (and thus this middleware) runs
//     before any static asset is served, for every path, so returning a Response
//     here reliably beats the prerendered HTML / the `.md` asset layer.
//   • void.json `routing.rewrites` map public `/docs/*` → `/en/docs/:splat` at
//     the edge BEFORE middleware, so `c.req.path` is already the internal,
//     locale-prefixed path (`/en/…`, `/cn/…`, `/pt-BR/…`) — the same shape as
//     the `@void/md/pages` route set and the emitted `<path>.md` assets.
//   • The markdown is read via the ASSETS binding (`c.env.ASSETS.fetch`), the
//     same mechanism `serveWithAssets` uses. In `vite dev` there is no ASSETS
//     binding and the `.md` files are not emitted, so negotiation no-ops to HTML
//     there (verify on preview/deploy).
//
// The pure q-value/specificity negotiation lives in lib/http/accept.ts; the
// cn/pt-BR → en resolution reuses lib/i18n/fallback.ts so markdown falls back
// exactly like the HTML page does.

import { defineMiddleware } from 'void'
import mdPages from '@void/md/pages'
import { negotiate } from '../lib/http/accept.ts'
import { decideFallback, looksLikeAsset } from '../lib/i18n/fallback.ts'

// Memoise the known-markdown-page Set against the `@void/md/pages` array
// identity (HMR-aware in dev, frozen in prod), mirroring 02.i18n-fallback.ts.
// This set is EXACTLY the routes that have an emitted `<path>.md` (island-only
// pages like the landing and changelog are not markdown and are absent here),
// so membership doubles as the "markdown available?" test.
let cachedSource: ReadonlyArray<{ path: string }> | undefined
let cachedSet: ReadonlySet<string> | undefined
function knownPaths(): ReadonlySet<string> {
  if (cachedSet && cachedSource === mdPages) return cachedSet
  cachedSource = mdPages
  cachedSet = new Set(mdPages.map((p) => p.path))
  return cachedSet
}

/** Strip a single trailing slash, keeping the root "/". */
function trimTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

function notAcceptable(): Response {
  return new Response(
    'Not Acceptable: this URL has no text/markdown representation.\n',
    {
      status: 406,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', Vary: 'Accept' },
    },
  )
}

export default defineMiddleware(async (c, next) => {
  // Only GET/HEAD navigations can carry a page representation.
  const method = c.req.method
  if (method !== 'GET' && method !== 'HEAD') return next()

  const path = trimTrailingSlash(c.req.path)

  // Asset requests (`/…​.md`, `/assets/*.js`, images, …) are served by the asset
  // layer as-is — never negotiate them (a direct `/docs/x.md` with
  // `Accept: text/markdown` must reach that file, not get a 406).
  if (looksLikeAsset(path)) return next()

  // Cheap path first: only agents that rank markdown above HTML do any work.
  // Browsers / `*/*` / ties fall straight through to the normal HTML render.
  const { prefersMarkdown, acceptsHtml } = negotiate(c.req.header('accept'))
  if (!prefersMarkdown) return next()

  // Resolve the markdown route for this page, reusing the i18n fallback rules so
  // an untranslated cn/pt-BR page yields the en markdown just as it yields the
  // en HTML.
  const known = knownPaths()
  let mdRoute: string | null = null
  if (known.has(path)) mdRoute = path
  else {
    const fb = decideFallback(path, known)
    if (fb.fallback && fb.destination) mdRoute = fb.destination
  }

  // No markdown representation for this route (landing, changelog, unknown).
  // Serve HTML if the client accepts it, else 406 per the acceptmarkdown spec.
  if (!mdRoute) return acceptsHtml ? next() : notAcceptable()

  // Dev / no ASSETS binding → the `.md` files aren't emitted; fall back to HTML.
  const assets = c.env.ASSETS
  if (!assets) return next()

  const url = new URL(c.req.url)
  url.pathname = `${mdRoute}.md`
  url.search = ''
  const asset = await assets.fetch(
    new Request(url.toString(), { method: 'GET' }),
  )
  if (asset.status !== 200) {
    // The route is a known markdown page but its asset is unexpectedly missing —
    // fail safe rather than 500: HTML if accepted, else 406.
    return acceptsHtml ? next() : notAcceptable()
  }

  const body = method === 'HEAD' ? null : await asset.text()
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      // Cache correctly across representations, and (matching the `.md` asset
      // layer, which stamps no-store for non-/assets/ paths) don't let an
      // intermediary pin one representation to this shared URL.
      Vary: 'Accept',
      'Cache-Control': 'no-store',
    },
  })
})
