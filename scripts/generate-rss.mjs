// scripts/generate-rss.mjs
//
// Build-time RSS 2.0 feed generator for the napi.rs blog on Void (Vite +
// Cloudflare). Net-new: the live napi.rs site ships NO feed, so this adds one.
//
// Run: node scripts/generate-rss.mjs   (no transpile — pure ESM JS)
// Normally invoked by the `napi-rs-rss` Vite build plugin (vite.config.ts) so it
// runs on every `vp build` / `void deploy`; written defensively so it also runs
// standalone (so `dist/client` may not exist yet — it is created).
//
// ----------------------------------------------------------------------------
// Scope (one canonical feed, deliberately small — the blog has 3 posts):
//   • Source: the en blog posts only (pages/en/blog/*.md). The blog is
//     overwhelmingly en (the one translated post — the v2 announcement — is not
//     worth a second feed), and changelog pages are dynamic GitHub-release
//     islands with no static post list, so they are NOT a feed source.
//   • Output: dist/client/rss.xml — discovered via the void.json
//     `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`.
//   • Each item: title + canonical link + guid + pubDate (from the post's
//     frontmatter `date`) + an optional description (the leading blockquote
//     summary). Posts WITHOUT a `date` are skipped and reported, never guessed.
//   • Items are sorted newest-first; the feed is deterministic + idempotent
//     (byte-identical re-runs) — no build-time `now()` leaks in.
// ----------------------------------------------------------------------------

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { fileToRoute, BASE_URL } from './generate-sitemap.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const pagesDir = join(root, 'pages')
const distClient = join(root, 'dist', 'client')

// The en blog lives here; its public routes are `/blog/<slug>` (en is served
// unprefixed — see lib/docs/locale.ts). Only `.md` files are posts (the blog
// `layout.island.tsx` is chrome, not a post).
const BLOG_REL_DIR = 'en/blog'

const FEED_TITLE = 'NAPI-RS Blog'
const FEED_DESCRIPTION =
  'NAPI-RS, a framework for building pre-compiled Node.js addons in Rust'

// ----------------------------------------------------------------------------
// Pure helpers
// ----------------------------------------------------------------------------

/** XML-escape text for an element body or attribute value. */
function xmlEscape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Parse a blog `.md` source into `{ frontmatter, summary }`.
 *
 * The island blog pages (announce-v2/v3) put a `<script>` import block at byte 0
 * with the frontmatter AFTER it, so the `---…---` block is NOT necessarily at
 * the start — strip a leading `<script>…</script>` first. Frontmatter is a tiny
 * flat `key: value` map here (title, date), so a full YAML parser is overkill;
 * read the quoted scalars we need.
 *
 * `summary` is the first blockquote line (the `> 🦀 …` blurb the announcement
 * posts open with), markdown links reduced to their text and the lead emoji
 * dropped — a clean one-liner for `<description>`. Posts without such a
 * blockquote (e.g. function-and-callbacks) yield `''` (a title-only item).
 */
function parsePost(raw) {
  const afterScript = raw.replace(/^\s*<script[\s\S]*?<\/script>\s*/i, '')
  const fmMatch = afterScript.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)

  const frontmatter = {}
  if (fmMatch) {
    for (const line of fmMatch[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
      if (kv) frontmatter[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '')
    }
  }

  const body = fmMatch ? afterScript.slice(fmMatch[0].length) : afterScript
  let summary = ''
  const bq = body.match(/^>[ \t]+(\S.*)$/m)
  if (bq) {
    summary = bq[1]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url) -> text
      .replace(/^\p{Extended_Pictographic}[️]?\s*/u, '') // drop lead emoji
      .trim()
  }
  return { frontmatter, summary }
}

/** RFC-822 pubDate for an ISO `YYYY-MM-DD` (parsed as UTC midnight). */
function toPubDate(isoDate) {
  // Deterministic: a fixed date string -> a fixed UTC string. No `now()`.
  return new Date(`${isoDate}T00:00:00Z`).toUTCString()
}

/** Render the channel XML for a sorted list of `{ title, link, date, summary }`. */
function renderFeed(items) {
  const feedUrl = `${BASE_URL}/rss.xml`
  const lastBuild = items.length ? toPubDate(items[0].date) : ''
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xmlEscape(FEED_TITLE)}</title>`,
    `    <link>${BASE_URL}/</link>`,
    `    <description>${xmlEscape(FEED_DESCRIPTION)}</description>`,
    '    <language>en</language>',
    `    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>`,
  ]
  if (lastBuild) lines.push(`    <lastBuildDate>${lastBuild}</lastBuildDate>`)
  for (const item of items) {
    const url = `${BASE_URL}${item.link}`
    lines.push('    <item>')
    lines.push(`      <title>${xmlEscape(item.title)}</title>`)
    lines.push(`      <link>${url}</link>`)
    lines.push(`      <guid isPermaLink="true">${url}</guid>`)
    lines.push(`      <pubDate>${toPubDate(item.date)}</pubDate>`)
    if (item.summary) {
      lines.push(`      <description>${xmlEscape(item.summary)}</description>`)
    }
    lines.push('    </item>')
  }
  lines.push('  </channel>', '</rss>', '')
  return lines.join('\n')
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

/**
 * Emit `rss.xml` into `outDir` (defaults to dist/client). Idempotent. Returns
 * `{ itemCount, skipped, feedPath, outDir }` for logging; `skipped` lists post
 * slugs dropped for lacking a frontmatter `date` (so the build log flags them).
 */
function generateRss(outDir = distClient) {
  const blogDir = join(pagesDir, BLOG_REL_DIR)
  const items = []
  const skipped = []

  for (const name of readdirSync(blogDir).sort()) {
    if (!name.endsWith('.md')) continue
    const route = fileToRoute(`${BLOG_REL_DIR}/${name}`)
    if (route === null) continue
    const { frontmatter, summary } = parsePost(
      readFileSync(join(blogDir, name), 'utf8'),
    )
    if (!frontmatter.date) {
      skipped.push(name.replace(/\.md$/, ''))
      continue
    }
    items.push({
      title: frontmatter.title ?? route,
      link: route,
      date: frontmatter.date,
      summary,
    })
  }

  // Newest first; tie-break on link so re-runs are byte-identical.
  items.sort((a, b) =>
    a.date === b.date ? a.link.localeCompare(b.link) : a.date < b.date ? 1 : -1,
  )

  mkdirSync(outDir, { recursive: true })
  const feedPath = join(outDir, 'rss.xml')
  writeFileSync(feedPath, renderFeed(items), 'utf8')

  return { itemCount: items.length, skipped, feedPath, outDir }
}

function main() {
  const { itemCount, skipped, feedPath } = generateRss(distClient)
  console.log(`rss: wrote ${itemCount} blog posts to ${feedPath}`)
  if (skipped.length) {
    console.log(`rss: skipped (no frontmatter date): ${skipped.join(', ')}`)
  }
}

// Run as a CLI when invoked directly; stay side-effect-free when imported.
const cliEntry = process.argv[1]
if (cliEntry && import.meta.url === pathToFileURL(cliEntry).href) {
  main()
}

export { parsePost, renderFeed, toPubDate, generateRss }
