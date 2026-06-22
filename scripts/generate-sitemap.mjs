// scripts/generate-sitemap.mjs
//
// Build-time sitemap generator + raw-markdown asset emitter for the napi.rs
// docs site on Void (Vite + Cloudflare). Replaces the deleted Next sitemap
// route AND the deleted pages/api/raw/[...slug].js raw-view endpoint.
//
// Integrated into the build via `sitemapPlugin()` (a Vite plugin exported below,
// registered in vite.config.ts) — it runs on every `vite build` / `void deploy`.
// `generateSitemap()` + the pure route helpers stay exported for the standalone
// CLI (`node scripts/generate-sitemap.mjs`, the `sitemap` npm script) and the
// unit test. Pure ESM JS, no transpile.
//
// ----------------------------------------------------------------------------
// Routing model (authoritative — lib/docs/locale.ts + void.json):
//   • 3 locales: `en` (DEFAULT, served at ROOT, hrefs UNPREFIXED), `cn` and
//     `pt-BR` (served under their own `/<locale>/` prefix).
//   • Pages physically live under pages/<locale>/… ; void.json rewrites map the
//     public unprefixed en URLs onto the internal /en/ files:
//       "/" -> "/en", "/docs/*" -> "/en/docs/:splat",
//       "/blog/*" -> "/en/blog/:splat", "/changelog/*" -> "/en/changelog/:splat"
//   • So the PUBLIC route for an en page drops the leading `en/`; cn / pt-BR
//     keep their `/<locale>/` prefix. This asymmetry is the whole game here.
//
// Two emissions, both deterministic + idempotent (byte-identical re-runs):
//   1. dist/client/sitemap.xml — one <url><loc> per public route, sorted.
//   2. raw .md assets — verbatim bytes of every pages/**/*.md SOURCE copied to
//      the public route + ".md" (and, for en, ALSO the internal /en/ shape) so
//      the AI raw-view resolves at either URL. Islands have no .md source, so
//      they appear in the sitemap but emit no raw file.
// ----------------------------------------------------------------------------

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  statSync,
} from 'node:fs'
import { join, dirname, resolve, relative, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const pagesDir = join(root, 'pages')
const distClient = join(root, 'dist', 'client')

const BASE_URL = 'https://napi.rs'

// Default locale is served at the ROOT (unprefixed); the others keep a prefix.
const DEFAULT_LOCALE = 'en'
const LOCALES = new Set(['en', 'cn', 'pt-BR'])

// Route-bearing page extensions. `.island.tsx` is checked before `.md` because
// neither is a suffix of the other, but order keeps the intent obvious.
const PAGE_EXTS = ['.island.tsx', '.md']

// ----------------------------------------------------------------------------
// Pure route derivation
// ----------------------------------------------------------------------------

/**
 * Map a page file path (relative to pages/, POSIX slashes) to its PUBLIC route
 * string, or null when the file is not a route (excluded). Pure + deterministic
 * — no filesystem access — so it is unit-testable in isolation.
 *
 * Exclusions:
 *   • any file named `layout.island.tsx` (theme layout, not a page)
 *   • any path segment starting with `_` (private / meta)
 *   • `*.server.ts` (route loader/action companion, not a page)
 *   • anything under `legacy_pages/` (never passed in, but defensive)
 *   • any extension other than `.md` / `.island.tsx`
 *
 * Route rules:
 *   • strip the page extension
 *   • split off the leading locale segment (en|cn|pt-BR); a first segment that
 *     is none of these is treated as en-rooted (defensive)
 *   • a basename of `index` collapses to its directory (drop `index`)
 *   • en (default): route = "/" + rest                (UNPREFIXED)
 *   • cn / pt-BR:   route = "/<locale>/" + rest        (PREFIXED)
 *   • collapse duplicate slashes; no trailing slash except the root "/"
 *
 * Examples:
 *   en/docs/introduction/getting-started.md -> /docs/introduction/getting-started
 *   cn/docs/concepts/class.md               -> /cn/docs/concepts/class
 *   en/index.island.tsx                     -> /
 *   cn/index.island.tsx                     -> /cn
 *   en/changelog/napi.island.tsx            -> /changelog/napi
 *   en/docs/layout.island.tsx               -> null
 */
function fileToRoute(relPath) {
  // Normalise separators; tolerate a stray leading slash.
  let p = relPath.replace(/\\/g, '/').replace(/^\/+/, '')

  // legacy_pages/ is never a route source.
  if (p === 'legacy_pages' || p.startsWith('legacy_pages/')) return null

  // *.server.ts companions are loaders/actions, not pages.
  if (p.endsWith('.server.ts')) return null

  // Strip the recognised page extension; reject anything else.
  let stripped = null
  for (const ext of PAGE_EXTS) {
    if (p.endsWith(ext)) {
      stripped = p.slice(0, -ext.length)
      break
    }
  }
  if (stripped === null) return null

  const segments = stripped.split('/').filter((s) => s.length > 0)
  if (segments.length === 0) return null

  // Exclude layout entries and any private/meta segment (`_…`). The layout
  // check is on the BASENAME via the extension we just stripped.
  const basename = segments[segments.length - 1]
  if (basename === 'layout' && p.endsWith('.island.tsx')) return null
  if (segments.some((s) => s.startsWith('_'))) return null

  // Split off the leading locale segment; default to en-rooted if absent.
  let locale = DEFAULT_LOCALE
  let rest = segments
  if (LOCALES.has(segments[0])) {
    locale = segments[0]
    rest = segments.slice(1)
  }

  // `index` basename collapses to its directory.
  if (rest.length > 0 && rest[rest.length - 1] === 'index') {
    rest = rest.slice(0, -1)
  }

  const tail = rest.join('/')
  if (locale === DEFAULT_LOCALE) {
    return tail ? `/${tail}` : '/'
  }
  return tail ? `/${locale}/${tail}` : `/${locale}`
}

// ----------------------------------------------------------------------------
// File discovery
// ----------------------------------------------------------------------------

/** Recursively list every file under `dir` as a path relative to `pagesDir`. */
function walkPages(dir) {
  const out = []
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...walkPages(full))
    } else {
      out.push(relative(pagesDir, full).replace(/\\/g, '/'))
    }
  }
  return out
}

// ----------------------------------------------------------------------------
// Sitemap rendering
// ----------------------------------------------------------------------------

/** Render the urlset XML for a sorted, deduped list of routes. */
function renderSitemap(routes) {
  const urls = routes.map((r) => `  <url><loc>${BASE_URL}${r}</loc></url>`)
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}

// ----------------------------------------------------------------------------
// Raw-markdown emission
// ----------------------------------------------------------------------------

/**
 * The dist/client-relative target paths a `.md` source's verbatim bytes are
 * copied to, given its public `route` and source `relPath` (relative to
 * pages/). The route + ".md" shape always applies; en pages ALSO get the
 * internal `/en/…` prefixed shape so `/docs/x.md` AND `/en/docs/x.md` both
 * resolve. cn / pt-BR are already prefixed, so they get the single shape.
 *
 * Root "/" never has a .md source (it is an island landing page), so the
 * route-as-directory edge case (route ending without a leaf) never produces a
 * bare "/.md"; guarded anyway.
 */
function rawTargets(route, relPath) {
  const targets = []
  if (route !== '/') {
    targets.push(`${route.replace(/^\//, '')}.md`)
  }
  // en pages: also emit the internal /en/ prefixed shape. The source path
  // already IS that shape (`en/docs/x.md`), so it mirrors the file tree exactly
  // regardless of the public route collapse — e.g. `en/docs/x.md` is served at
  // both `/docs/x.md` (above) and `/en/docs/x.md` (here).
  if (relPath.startsWith('en/')) {
    targets.push(relPath)
  }
  return targets
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

/**
 * Emit `sitemap.xml` + the raw `.md` assets into `outDir` (defaults to
 * dist/client). Pure of any build-tool coupling so it serves BOTH the CLI
 * `main()` and the Vite build plugin (lib/build/vite-plugin-sitemap or the
 * inline plugin in vite.config.ts). Idempotent: byte-identical re-runs.
 * Returns counts + the absolute sitemap path for logging.
 */
function generateSitemap(outDir = distClient) {
  const files = walkPages(pagesDir)

  // --- routes (sitemap) ---
  const routeSet = new Set()
  for (const rel of files) {
    const route = fileToRoute(rel)
    if (route !== null) routeSet.add(route)
  }
  const routes = [...routeSet].sort()

  mkdirSync(outDir, { recursive: true })
  const sitemapPath = join(outDir, 'sitemap.xml')
  writeFileSync(sitemapPath, renderSitemap(routes), 'utf8')

  // --- raw markdown assets ---
  // Only `.md` SOURCE files have raw markdown to serve (islands have none).
  // Copy verbatim bytes (Buffer, no re-encode) so a byte-0 `<script>` island
  // block on an island .md page is preserved exactly.
  let rawCount = 0
  const writtenRaw = new Set()
  for (const rel of files) {
    if (!rel.endsWith('.md')) continue
    const route = fileToRoute(rel)
    if (route === null) continue
    const bytes = readFileSync(join(pagesDir, rel))
    for (const target of rawTargets(route, rel)) {
      if (writtenRaw.has(target)) continue
      const outPath = join(outDir, target)
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, bytes)
      writtenRaw.add(target)
      rawCount++
    }
  }

  return { routeCount: routes.length, rawCount, sitemapPath, outDir }
}

/**
 * Vite build plugin: emit sitemap.xml + the raw `.md` assets into the CLIENT
 * build output after the bundle is written. Void runs TWO build environments
 * (void_worker -> dist/ssr, client -> dist/client); this hooks the CLIENT output
 * only. `writeBundle` fires after the files are on disk and `emptyOutDir` already
 * ran at build start, so nothing wipes them afterward. This matters because
 * `void deploy` runs `vp build` (Vite) — NOT `npm run build` — so the npm
 * `postbuild` hook never fires; this plugin is what guarantees the sitemap ships
 * on every build/deploy. `generateSitemap()` stays exported for the standalone
 * CLI (`npm run sitemap`) + the unit test.
 */
function sitemapPlugin() {
  return {
    name: 'napi-rs-sitemap',
    apply: 'build',
    writeBundle(options) {
      if (!options.dir || basename(options.dir) !== 'client') return
      const { routeCount, rawCount } = generateSitemap(options.dir)
      console.log(
        `napi-rs-sitemap: ${routeCount} routes + ${rawCount} raw .md files -> ${options.dir}`,
      )
    },
  }
}

function main() {
  const { routeCount, rawCount, sitemapPath } = generateSitemap(distClient)
  console.log(
    `sitemap: wrote ${routeCount} routes to ${relative(root, sitemapPath)}`,
  )
  console.log(`sitemap: emitted ${rawCount} raw .md files under dist/client`)
}

// Run as a CLI when invoked directly, but stay side-effect-free when imported
// (so the unit test can pull in fileToRoute without touching the filesystem).
// `process.argv[1]` is undefined in bare dynamic-import contexts, where
// pathToFileURL(undefined) would THROW — guard it.
const cliEntry = process.argv[1]
if (cliEntry && import.meta.url === pathToFileURL(cliEntry).href) {
  main()
}

export {
  fileToRoute,
  renderSitemap,
  rawTargets,
  generateSitemap,
  sitemapPlugin,
  BASE_URL,
}
