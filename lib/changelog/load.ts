// Changelog loader runtime — the env + network side (kept OUT of the pure
// render.ts so render stays unit-testable). Fetches all GitHub releases for the
// napi-rs monorepo, builds the per-package markdown, and renders it to HTML.
//
// Used by the 5 pages/en/changelog/*.server.ts loaders. The package FILTER
// STRING differs from the route stem (the underscore stems map to hyphenated
// crate names and napi-cli maps to `@napi-rs/cli`) — each server file passes its
// own literal, matching the legacy getStaticProps('<filterString>') calls.

import { env } from 'void/env'
import { logger } from 'void/log'

import { buildChangelogMarkdown, renderChangelogHtml } from './render.ts'

const RELEASES_URL =
  'https://api.github.com/repos/napi-rs/napi-rs/releases?per_page=100'

/**
 * Fetch every release page (paginating while a full 100-length array comes
 * back), build the markdown for `packageName`, and render it to HTML.
 *
 * - Authorization is CONDITIONAL: the header is omitted when `GITHUB_TOKEN` is
 *   unset so unauthenticated dev works (a bogus token would 401). When set, it
 *   is sent as `token <GITHUB_TOKEN>` (matching the legacy generator).
 * - The whole network section is wrapped so the TWO GitHub failure modes are
 *   handled identically: a THROWN fetch (DNS / connection-reset / the worker
 *   sandbox's "Network connection lost") AND a non-array error body (rate-limit
 *   / 401, whose `.length`/`.filter` the legacy code crashed on). In PRODUCTION
 *   we rethrow so Void emits a 500 — the ISR proxy then keeps serving the last
 *   good (stale) page and NEVER caches a blank body for the 300s revalidate
 *   window (legacy `getStaticProps` threw too, so Next kept serving stale). In
 *   DEV (unauthenticated/rate-limited GitHub, flaky sandbox network) we degrade
 *   to empty HTML so local renders work without a token.
 */
export async function loadChangelogHtml(
  packageName: string,
  locale = 'en',
): Promise<{ html: string }> {
  const headers: Record<string, string> = {
    'User-Agent': 'napi-rs-website',
    Accept: 'application/vnd.github+json',
    ...(env.GITHUB_TOKEN ? { Authorization: `token ${env.GITHUB_TOKEN}` } : {}),
  }

  const all: unknown[] = []
  try {
    // Paginate while a page is a FULL 100-length array. A short/empty array
    // means the last page; a non-array means a GitHub error body.
    let page = 1
    let more = true
    while (more) {
      const res = await fetch(`${RELEASES_URL}&page=${page}`, { headers })
      const json: unknown = await res.json()
      if (!Array.isArray(json)) {
        throw new Error(
          `GitHub releases response was not an array (status=${res.status})`,
        )
      }
      all.push(...json)
      more = json.length === 100
      page++
    }
  } catch (err) {
    logger.error('changelog: failed to fetch GitHub releases', {
      packageName,
      error: err instanceof Error ? err.message : String(err),
    })
    // `import.meta.env.PROD` is statically replaced by Vite in the worker build
    // (true on `vite build`, false on `vite dev`) — see the doc comment above.
    if (import.meta.env.PROD) {
      throw err
    }
    return { html: '' }
  }

  const md = await buildChangelogMarkdown(all, packageName, locale)
  return { html: await renderChangelogHtml(md) }
}
