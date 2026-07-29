// Build-time emitter for the client-side search index consumed by SearchDialog.
//
// Why a dist artifact: Cmd+K search must work fully client-side with zero
// server API, so we precompute one JSON per locale at build time
// (`/search-index.<locale>.json` at the root of dist/client) and the dialog
// fetches it lazily. Entries mirror lib/docs/search-index.ts's contract:
// `path` is the md-style path (`/en/docs/x`), `href` the public route (en
// unprefixed), `section` 'docs' | 'blog', `group` the sidebar group title (''
// for flat/absent), plus headings and a plain-text body (code fence contents
// kept — API names are prime search targets — fence markers/info stripped).
// Non-en locales get EN-fallback mirror entries for leaves with no localized
// page, the same rule as lib/i18n/fallback.ts.
//
// Emitted by searchIndexPlugin() (registered in vite.config.ts) during the
// client writeBundle; also runnable standalone: `node scripts/build-search-index.mjs [outDir]`.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { DEFAULT_LOCALE, PREFIXED_LOCALES } from '../lib/docs/locale.ts'
import { nav } from '../lib/nav/index.ts'

/** All locales, default first — the emission order of the per-locale files. */
export const LOCALES = [DEFAULT_LOCALE, ...PREFIXED_LOCALES]

export const RAW_PAGES_DIR = join(import.meta.dirname, '..', 'pages')
export const DEFAULT_OUT_DIR = join(import.meta.dirname, '..', 'dist', 'client')

/** Soft cap on the searchable body. Generous on purpose: truncating real
 * pages (the old 6000 limit cut ~60% of EN pages) made later API identifiers
 * unsearchable — search recall beats a smaller JSON here. */
export const BODY_LIMIT = 50000

export function stripFrontmatter(markdown) {
  // Leading blank lines tolerated: after stripping a byte-0 <script> island
  // block the frontmatter no longer sits at byte 0.
  return markdown.replace(/^\s*---\n[\s\S]*?\n---\n?/, '')
}

export function stripScriptBlock(markdown) {
  return markdown.replace(/^<script>[\s\S]*?<\/script>\n?/, '')
}

// Heading slugs MUST match the ids the page actually renders with. @void/md
// uses markdown-it-anchor with its DEFAULT slugify (verified against
// node_modules/@void/md + a live compile probe):
//   encodeURIComponent(String(text).trim().toLowerCase().replace(/\s+/g, '-'))
// applied to the heading's text/code_inline content ONLY — so backtick code
// keeps its CONTENT, inline HTML (`Promise<T>`) is DROPPED, CJK is
// percent-encoded, underscores are kept, and `## Dup` repeats get `-1`, `-2`.
// A `{#custom}` attr (markdown-it-attrs) wins over the computed slug.
export function slugify(text) {
  return encodeURIComponent(
    String(text).trim().toLowerCase().replace(/\s+/g, '-'),
  )
}

/**
 * Replicate markdown-it-anchor's getTokensText on a RAW heading line: keep
 * plain text and code contents, drop everything else (images, inline HTML,
 * emphasis markers — but NOT intra-word underscores, which markdown does not
 * treat as emphasis). Also strips a trailing markdown-it-attrs `{…}` block.
 *
 * Code spans are extracted FIRST and kept verbatim: inside backticks,
 * `PromiseRaw<'env, T>` is CODE CONTENT (kept by getTokensText), not inline
 * HTML — stripping `<…>` before backticks would mangle it to `PromiseRaw`
 * while the rendered anchor keeps the full generic.
 */
export function headingText(raw) {
  const noAttrs = raw.replace(/\{[^{}]*\}\s*$/, '') // trailing {#id} / {.class}
  return noAttrs
    .split(/(`[^`]*`)/g) // [text, code, text, …] — code spans kept whole
    .map((part) => {
      if (part.length >= 2 && part.startsWith('`') && part.endsWith('`')) {
        return part.slice(1, -1) // code content, verbatim
      }
      return part
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images dropped entirely
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links keep their label
        .replace(/<[^>]+>/g, '') // inline HTML dropped (Promise<T> -> Promise)
        .replace(/(\*\*|~~|\*)/g, '') // emphasis markers (NOT `_` — intraword)
    })
    .join('')
    .trim()
}

/** depth 2–4 headings; deeper ones are noise, the H1 is the page title. */
export function collectHeadings(markdown) {
  const headings = []
  const slugs = new Set()
  for (const line of markdown.split('\n')) {
    const m = /^(#{2,4})\s+(.+?)\s*$/.exec(line)
    if (!m) continue
    // An explicit `{#custom-id}` wins over the computed slug (markdown-it-attrs
    // sets heading_open id before the anchor rule runs).
    const explicit = /\{#([^}\s]+)\}\s*$/.exec(m[2])
    const text = headingText(m[2])
    const base = explicit ? explicit[1] : slugify(text)
    // markdown-it-anchor dedup: base, base-1, base-2, … (uniqueSlugStartIndex 1)
    let slug = base
    for (let i = 1; slugs.has(slug); i++) slug = `${base}-${i}`
    slugs.add(slug)
    headings.push({ depth: m[1].length, slug, text })
  }
  return headings
}

/**
 * Reduce markdown to plain searchable text: frontmatter/script island gone,
 * heading/callout markers dropped (text kept), links keep their label, images
 * and HTML gone, table pipes and inline-code ticks removed. Code fence
 * CONTENTS are kept verbatim (minus fence markers + info string).
 */
export function markdownToPlainText(markdown) {
  const noScript = stripScriptBlock(markdown) // FIRST: see pageTitle note
  // Fence-marker lines go BEFORE the inline-code split: triple-backtick runs
  // would otherwise parse as empty "code spans" and leak the info string.
  const noFencesOrFrontmatter = stripFrontmatter(noScript)
    .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*$/gm, '')
    .replace(/^ {0,3}#{1,6}[ \t]+/gm, '')
    .replace(/^ {0,3}:::.*$/gm, '')
  // Split on backticks so the HTML strip below can't eat generics inside
  // inline code (`PromiseRaw<'env, T>` is searchable code, not a tag).
  return noFencesOrFrontmatter
    .split(/(`[^`]*`)/g)
    .map((part) =>
      part.length >= 2 && part.startsWith('`') && part.endsWith('`')
        ? part.slice(1, -1)
        : part.replace(/<[^>]+>/g, ' ').replace(/(\*\*|~~|\*)/g, ' '),
    )
    .join(' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function pageTitle(markdown) {
  const m = /^#\s+(.+)$/m.exec(markdown)
  if (m) return m[1].trim()
  // No H1 (some localized pages start at H2): fall back to the frontmatter
  // `title:` — the same title the metadata index and <title> use — rather
  // than emitting a blank, unmatchable result row. The byte-0 `<script>`
  // island block must be stripped FIRST or the `^---` anchor never matches
  // (webassembly + announce-v2/v3 pages are script-first).
  const fm = /^\s*---\n([\s\S]*?)\n---/.exec(stripScriptBlock(markdown))
  const t = fm ? /^title:\s*(.+)$/m.exec(fm[1]) : null
  return t ? t[1].trim().replace(/^['"]|['"]$/g, '') : ''
}

export function pageDescription(markdown) {
  const m = /^\s*---\n([\s\S]*?)\n---/.exec(stripScriptBlock(markdown))
  if (!m) return undefined
  const d = /^description:\s*(.+)$/m.exec(m[1])
  return d ? d[1].trim().replace(/^['"]|['"]$/g, '') : undefined
}

/** `/en/docs/x` -> `/docs/x`; other locales keep their prefix. */
export function publicHrefFromPath(path) {
  const segs = path.split('/').filter(Boolean)
  if (segs[0] === 'en') segs.shift()
  return '/' + segs.join('/')
}

function leafFromPath(path) {
  return path.split('/').slice(2).join('/')
}

/** Sidebar group title for a leaf in one locale's nav ('' when flat/absent). */
export function groupForLeaf(localeNav, leaf) {
  const section = leaf.split('/')[0]
  for (const group of localeNav.sidebar[section] ?? []) {
    for (const item of group.items) {
      if (item.path === leaf) return group.title
    }
  }
  return ''
}

/**
 * Pure core: rawPages = [{ filePath: 'en/docs/concepts/enum.md', markdown }],
 * nav = the generated nav map. Returns { <locale>: SearchEntry[] } with
 * EN-fallback mirror entries folded into each non-en locale.
 */
export function buildSearchIndex(rawPages, navMap) {
  const byLocale = new Map()
  for (const locale of LOCALES) byLocale.set(locale, [])
  for (const { filePath, markdown } of rawPages) {
    const path = '/' + filePath.replace(/\.md$/, '')
    const locale = path.split('/')[1]
    if (!byLocale.has(locale)) continue
    const leaf = leafFromPath(path)
    const entry = {
      path,
      href: publicHrefFromPath(path),
      title: pageTitle(markdown),
      section: leaf.split('/')[0],
      group: groupForLeaf(navMap[locale], leaf),
      headings: collectHeadings(stripScriptBlock(stripFrontmatter(markdown))),
      body: markdownToPlainText(markdown).slice(0, BODY_LIMIT),
    }
    const description = pageDescription(markdown)
    if (description) entry.description = description
    byLocale.get(locale).push(entry)
  }

  // EN-fallback mirroring: a leaf with no localized page still shows up in the
  // locale's index (localized path/href, EN content) so search works there.
  const enEntries = byLocale.get('en')
  const result = { en: enEntries }
  for (const locale of LOCALES) {
    if (locale === 'en') continue
    const own = byLocale.get(locale)
    const ownLeaves = new Set(own.map((e) => leafFromPath(e.path)))
    const mirrored = enEntries
      .filter((e) => !ownLeaves.has(leafFromPath(e.path)))
      .map((e) => {
        const leaf = leafFromPath(e.path)
        return {
          ...e,
          path: `/${locale}/${leaf}`,
          href: `/${locale}/${leaf}`,
          // The locale's own nav lists fallback leaves (see llmsHrefFor), so
          // the group label comes from the TARGET locale's sidebar.
          group: groupForLeaf(navMap[locale], leaf),
        }
      })
    result[locale] = [...own, ...mirrored]
  }
  return result
}

/** Every pages/<locale> md file as { filePath, markdown } (from disk). */
export function collectRawPages(pagesDir = RAW_PAGES_DIR) {
  const rawPages = []
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.name.endsWith('.md')) rawPages.push(p)
    }
  }
  for (const locale of LOCALES) {
    const dir = join(pagesDir, locale)
    if (existsSync(dir)) walk(dir)
  }
  rawPages.sort()
  return rawPages.map((abs) => ({
    filePath: abs.slice(pagesDir.length + 1),
    markdown: readFileSync(abs, 'utf8'),
  }))
}

export function writeSearchIndexes(outDir, pagesDir = RAW_PAGES_DIR) {
  const indexes = buildSearchIndex(collectRawPages(pagesDir), nav)
  mkdirSync(outDir, { recursive: true })
  for (const locale of LOCALES) {
    writeFileSync(
      join(outDir, `search-index.${locale}.json`),
      JSON.stringify(indexes[locale]),
    )
  }
  return indexes
}

/**
 * Vite plugin: after the client bundle is written, emit one search index JSON
 * per locale at the root of dist/client. Follows sitemapPlugin()'s pattern —
 * writeBundle fires once per output dir; only the one whose basename is
 * 'client' is the static-assets dir.
 */
export function searchIndexPlugin() {
  return {
    name: 'napi-rs-search-index',
    apply: 'build',
    writeBundle(options) {
      if (basename(options.dir ?? '') !== 'client') return
      const indexes = writeSearchIndexes(options.dir)
      const total = Object.values(indexes).reduce(
        (n, entries) => n + entries.length,
        0,
      )
      console.log(
        `[search-index] wrote search-index.{${LOCALES.join(',')}}.json (${total} entries)`,
      )
    },
  }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const outDir = process.argv[2] ?? DEFAULT_OUT_DIR
  const indexes = writeSearchIndexes(outDir)
  const total = Object.values(indexes).reduce(
    (n, entries) => n + entries.length,
    0,
  )
  console.log(
    `[search-index] wrote search-index.{${LOCALES.join(',')}}.json to ${outDir} (${total} entries)`,
  )
}
