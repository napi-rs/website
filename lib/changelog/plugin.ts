// Vite plugin: build-time changelog data.
//
// Exposes one virtual module per changelog page — `virtual:changelog/<slug>` —
// whose default export is the package's FULL release history rendered to HTML.
// The fetch + Shiki render run ONCE during the Vite build (memoised across the
// five packages), in Node, where there is no Cloudflare 128 MB worker limit.
//
// Why a virtual module (not a runtime loader): a Void page with a `loader` is
// always worker-served, so rendering ~565 releases × Shiki per request OOM'd the
// isolate (raw CF 1101). The changelog page islands instead `import` these
// virtual modules; with NO loader they auto-prerender to static, cookie-agnostic
// HTML, and because the page-island module is never a client rollup input the
// rendered HTML stays in the SSR bundle and is NEVER shipped to the browser.
//
// The result is baked at build, so deploys carry the history with them — refresh
// by redeploying. GITHUB_TOKEN is OPT-IN (anonymous works but is rate-limited);
// it is read from the Vite env (.env.local) / process.env, never sent to the
// client. Runs in `vite build`, `void deploy`, and `vite`/`void dev`; skipped
// under Vitest (the plugin is not registered there — see vite.config.ts).

import { loadEnv, type Plugin } from 'vite'

import { buildChangelogMarkdown, renderChangelogHtml } from './render.ts'

const RELEASES_URL =
  'https://api.github.com/repos/napi-rs/napi-rs/releases?per_page=100'

const VIRTUAL_PREFIX = 'virtual:changelog/'
const RESOLVED_PREFIX = '\0' + VIRTUAL_PREFIX

// Page slug -> the legacy getStaticProps('<filter>') string matched by
// `name.startsWith(...)`. `napi` deliberately also catches napi-derive/sys/build
// (a faithfully-replicated legacy quirk). The slug is the route stem each island
// imports, e.g. `import html from 'virtual:changelog/napi-build'`.
const PACKAGES: Record<string, string> = {
  napi: 'napi',
  'napi-build': 'napi-build',
  'napi-derive': 'napi-derive',
  'napi-sys': 'napi-sys',
  'napi-cli': '@napi-rs/cli',
}

/**
 * Fetch every release page, paginating while a full 100-length array returns.
 * Retries transient failures (429 / 5xx / network); throws on a hard failure so
 * the build fails LOUD rather than silently baking a degraded changelog.
 */
async function fetchAllReleases(token: string | undefined): Promise<unknown[]> {
  const headers: Record<string, string> = {
    'User-Agent': 'napi-rs-website',
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `token ${token}` } : {}),
  }

  const all: unknown[] = []
  let page = 1
  let more = true
  while (more) {
    const url = `${RELEASES_URL}&page=${page}`
    let json: unknown
    const maxAttempts = 5
    let lastError = ''
    for (let attempt = 0; ; attempt++) {
      let res: Response
      try {
        res = await fetch(url, { headers })
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        if (attempt + 1 >= maxAttempts) {
          throw new Error(
            `GitHub releases fetch failed (page ${page}): ${lastError}`,
          )
        }
        await new Promise((r) =>
          setTimeout(r, Math.min(1000 * 2 ** attempt, 15000)),
        )
        continue
      }
      if (res.ok) {
        const body: unknown = await res.json()
        if (!Array.isArray(body)) {
          throw new Error(
            `GitHub releases response was not an array (status=${res.status}, page ${page})`,
          )
        }
        json = body
        break
      }
      // Retry only transient statuses; fail fast on a 4xx that won't recover.
      if (res.status !== 429 && res.status < 500) {
        throw new Error(
          `GitHub releases request failed (status=${res.status}, page ${page})`,
        )
      }
      lastError = `status=${res.status}`
      if (attempt + 1 >= maxAttempts) {
        throw new Error(
          `GitHub releases request failed (page ${page}): ${lastError}`,
        )
      }
      await new Promise((r) =>
        setTimeout(r, Math.min(1000 * 2 ** attempt, 15000)),
      )
    }
    const list = json as unknown[]
    all.push(...list)
    more = list.length === 100
    page++
  }
  return all
}

export function changelogData(): Plugin {
  let token: string | undefined
  // Memoise the single network fetch across all five virtual modules. Cleared on
  // failure so a transient outage in `dev` can recover on the next page request.
  let releasesPromise: Promise<unknown[]> | null = null
  const getReleases = (): Promise<unknown[]> => {
    if (!releasesPromise) {
      releasesPromise = fetchAllReleases(token).catch((err) => {
        releasesPromise = null
        throw err
      })
    }
    return releasesPromise
  }

  return {
    name: 'napi-rs-changelog-data',

    config(_userConfig, { mode }) {
      // GITHUB_TOKEN lives in .env.local (dev) / the CI env (deploy); loadEnv
      // surfaces both. Never exposed to the client — used only in load() below.
      const env = loadEnv(mode, process.cwd(), 'GITHUB_')
      token = env.GITHUB_TOKEN || process.env.GITHUB_TOKEN
    },

    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX))
        return RESOLVED_PREFIX + id.slice(VIRTUAL_PREFIX.length)
      return null
    },

    async load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return null
      const slug = id.slice(RESOLVED_PREFIX.length)
      const filter = PACKAGES[slug]
      if (!filter) {
        this.error(
          `Unknown changelog package "${slug}". Known: ${Object.keys(PACKAGES).join(', ')}.`,
        )
      }
      const releases = await getReleases()
      const md = await buildChangelogMarkdown(releases, filter, 'en')
      const html = await renderChangelogHtml(md)
      return `export default ${JSON.stringify(html)}`
    },
  }
}
