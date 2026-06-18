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
 * - Every page response is GUARDED with `Array.isArray` before filtering /
 *   length checks: GitHub error bodies (rate-limit, 401, …) are OBJECTS, and
 *   the legacy code crashed on `.length`/`.filter` of an object. On a non-array
 *   we log via `void/log` and return empty HTML so the page still renders.
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
  // Paginate while a page is a FULL 100-length array. A short/empty array means
  // the last page; a non-array means an error body -> bail with empty HTML.
  let page = 1
  let more = true
  while (more) {
    const res = await fetch(`${RELEASES_URL}&page=${page}`, { headers })
    const json: unknown = await res.json()

    if (!Array.isArray(json)) {
      logger.error('changelog: GitHub releases response was not an array', {
        packageName,
        page,
        status: res.status,
      })
      return { html: '' }
    }

    all.push(...json)
    more = json.length === 100
    page++
  }

  const md = await buildChangelogMarkdown(all, packageName, locale)
  return { html: await renderChangelogHtml(md) }
}
