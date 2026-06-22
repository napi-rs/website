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
 * Edge-cache TTL (seconds) applied by the changelog loaders to a DEGRADED
 * (GitHub-failed) render. Short so a transient GitHub outage self-heals on the
 * next request rather than being pinned for the full 300s `revalidate` window.
 */
export const CHANGELOG_DEGRADED_REVALIDATE = 30

const ESCAPE_HTML: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
}

/**
 * A tiny static fallback shown when GitHub can't be reached, styled by the
 * surrounding `.void-md` content theme (the changelog layout wraps it). Keeps
 * the page useful (links to the live releases) instead of a 500 / blank body.
 */
function fallbackHtml(packageName: string): string {
  const name = packageName.replace(/[&<>]/g, (ch) => ESCAPE_HTML[ch])
  return (
    `<h1>${name}</h1>` +
    `<p>The changelog couldn't be loaded from GitHub just now. ` +
    `View the latest releases on ` +
    `<a href="https://github.com/napi-rs/napi-rs/releases" target="_blank" rel="noopener">GitHub</a>.</p>`
  )
}

/**
 * Fetch every release page (paginating while a full 100-length array comes
 * back), build the markdown for `packageName`, and render it to HTML.
 *
 * - Authorization is CONDITIONAL: the header is omitted when `GITHUB_TOKEN` is
 *   unset so unauthenticated dev works (a bogus token would 401). When set, it
 *   is sent as `token <GITHUB_TOKEN>` (matching the legacy generator).
 * - NEVER THROWS. The network section handles the THREE GitHub failure modes
 *   identically — a thrown fetch (DNS / connection-reset / the worker sandbox's
 *   "Network connection lost"), a non-2xx status (rate-limit 403 / bad-token
 *   401 / 5xx), and a non-array body — by returning a small static fallback
 *   page (`ok: false`) instead of throwing. A throw here surfaces as a RAW
 *   Cloudflare 1101 (5xx) to the user on a COLD cache: there is no stale entry
 *   to fall back to on a first request, and a `_ga`-cookie'd request bypasses
 *   the edge cache entirely (both verified live 2026-06-22), so the old
 *   "rethrow → ISR serves stale" assumption was wrong. The caller shortens the
 *   edge-cache TTL for an `ok: false` render (CHANGELOG_DEGRADED_REVALIDATE) so
 *   a transient outage self-heals on the next request instead of being pinned
 *   for the full 300s window.
 */
export async function loadChangelogHtml(
  packageName: string,
  locale = 'en',
): Promise<{ html: string; ok: boolean }> {
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
      // A non-2xx is a GitHub error (rate-limit 403 / bad-token 401 / 5xx)
      // whose body is a `{ message }` object, NOT the releases array — fail on
      // the status before parsing so the cause is reported precisely.
      if (!res.ok) {
        throw new Error(`GitHub releases request failed (status=${res.status})`)
      }
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

    // Build + render are INSIDE the try so the function is total — any failure
    // (fetch, parse, a malformed release body breaking the markdown/shiki
    // render) degrades to the fallback rather than throwing.
    const md = await buildChangelogMarkdown(all, packageName, locale)
    return { html: await renderChangelogHtml(md), ok: true }
  } catch (err) {
    logger.error('changelog: failed to fetch GitHub releases', {
      packageName,
      error: err instanceof Error ? err.message : String(err),
    })
    // NEVER rethrow: a throw surfaces as a raw Cloudflare 1101 (5xx) on a cold
    // cache (no stale entry on first / cookie-bearing requests — verified
    // live). Serve a fallback; the caller shortens its cache TTL so it retries.
    return { html: fallbackHtml(packageName), ok: false }
  }
}
