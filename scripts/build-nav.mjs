// scripts/build-nav.mjs
// Reads content/**/_meta.<locale>.json and generates lib/nav/index.ts
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const contentRoot = join(root, 'content')
const outFile = join(root, 'lib', 'nav', 'index.ts')

const LOCALES = ['en', 'cn', 'pt-BR']
const LOCALE_LABELS = {
  en: 'English',
  cn: '简体中文',
  'pt-BR': 'Português do Brasil',
}

function readMeta(dir, locale) {
  const file = join(dir, `_meta.${locale}.json`)
  if (!existsSync(file)) return null
  return JSON.parse(readFileSync(file, 'utf8'))
}

/** Title-case a hyphenated slug for a label when no _meta entry exists.
 *  e.g. "create-npm-dirs" -> "Create Npm Dirs". */
function humanize(slug) {
  return slug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/** Extract a display title from a _meta value (a string or a { title } object). */
function metaTitle(meta, key) {
  const v = meta?.[key]
  if (v == null) return undefined
  return typeof v === 'string' ? v : v.title
}

/** True if `docs/<key>` is a real sub-directory (a group) rather than a leaf
 *  file like `docs/cross-build.en.mdx`. */
function isGroupDir(key) {
  const dir = join(contentRoot, 'docs', key)
  return existsSync(dir) && statSync(dir).isDirectory()
}

/** On-disk leaf slugs (`<slug>.en.{md,mdx}`) under a docs group dir, sorted. EN
 *  is the canonical structural locale; other locales i18n-fall-back to it. */
function onDiskEnSlugs(dir) {
  return readdirSync(dir)
    .map((f) => f.match(/^(.+)\.en\.(?:mdx|md)$/))
    .filter(Boolean)
    .map((m) => m[1])
    .sort()
}

/**
 * The ONE canonical docs structure, derived from EN and reused for every locale
 * (localized only by label). Group order = docs/_meta.en.json key order. Each
 * group's leaves = its `<group>/_meta.en.json` slugs (in meta order) THEN any
 * on-disk `*.en.{md,mdx}` slugs not already listed (sorted). A top-level EN key
 * with no sub-directory (e.g. `cross-build.en.mdx`) becomes a standalone single-
 * item leaf group (group title == item title). `display:hidden` slugs are
 * skipped (but still block an on-disk re-add).
 */
function buildCanonicalDocsStructure() {
  const docsMetaEn = readMeta(join(contentRoot, 'docs'), 'en')
  if (!docsMetaEn) return []
  const structure = []
  for (const [key, value] of Object.entries(docsMetaEn)) {
    if (typeof value === 'object' && value.display === 'hidden') continue
    if (!isGroupDir(key)) {
      structure.push({ key, kind: 'leaf' })
      continue
    }
    const subDir = join(contentRoot, 'docs', key)
    const subMetaEn = readMeta(subDir, 'en') ?? {}
    const seen = new Set()
    const slugs = []
    for (const [slug, v] of Object.entries(subMetaEn)) {
      seen.add(slug) // hidden slugs still block the on-disk re-add below
      if (typeof v === 'object' && v.display === 'hidden') continue
      slugs.push(slug)
    }
    for (const slug of onDiskEnSlugs(subDir)) {
      if (seen.has(slug)) continue
      seen.add(slug)
      slugs.push(slug)
    }
    structure.push({ key, kind: 'group', slugs })
  }
  return structure
}

const CANONICAL_DOCS_STRUCTURE = buildCanonicalDocsStructure()

// Build docs sidebar groups for a locale by LOCALIZING the canonical EN
// structure. Every EN-derived group/leaf is emitted for every locale — there is
// NO per-locale content gate and NO empty-group drop; untranslated leaves render
// EN content at the same URL via the verified i18n-fallback middleware. Labels
// fall back _meta[locale] -> _meta.en -> humanize(slug).
function buildDocsSidebar(locale) {
  const topMeta = readMeta(join(contentRoot, 'docs'), locale) ?? {}
  const topMetaEn = readMeta(join(contentRoot, 'docs'), 'en') ?? {}
  const groups = []
  for (const entry of CANONICAL_DOCS_STRUCTURE) {
    const { key } = entry
    const groupTitle =
      metaTitle(topMeta, key) ?? metaTitle(topMetaEn, key) ?? humanize(key)

    if (entry.kind === 'leaf') {
      groups.push({
        group: key,
        title: groupTitle,
        items: [{ title: groupTitle, path: `docs/${key}` }],
      })
      continue
    }

    const subDir = join(contentRoot, 'docs', key)
    const subMeta = readMeta(subDir, locale) ?? {}
    const subMetaEn = readMeta(subDir, 'en') ?? {}
    const items = entry.slugs.map((slug) => ({
      title:
        metaTitle(subMeta, slug) ??
        metaTitle(subMetaEn, slug) ??
        humanize(slug),
      path: `docs/${key}/${slug}`,
    }))
    groups.push({ group: key, title: groupTitle, items })
  }
  return groups
}

// A FLAT section (blog / changelog) sidebar, derived ONCE from the EN `_meta`
// and emitted for EVERY locale — mirroring buildDocsSidebar. There is NO
// per-locale content gate: a cn/pt-BR leaf that lacks a localized source renders
// the EN page at the same URL via the i18n-fallback middleware. This is what
// keeps the Blog AND Changelog tabs visible under /cn and /pt-BR (matching live
// napi.rs); gating on localized content used to blank the sidebar — which hides
// the whole tab (Navbar/Breadcrumb/Pager derive visibility from it). Blog leaves
// fall back as markdown; the changelog leaves are loader-driven islands, so
// middleware/02.i18n-fallback unions lib/docs/page-data's ISLAND_PAGES into its
// known-page set to make /<locale>/changelog/* fall back too. Labels localize
// `_meta[locale]` -> `_meta.en` -> humanize(slug); order follows EN `_meta`.
function buildFlatSidebar(section, locale) {
  const metaEn = readMeta(join(contentRoot, section), 'en')
  if (!metaEn) return []
  const metaLocale = readMeta(join(contentRoot, section), locale) ?? {}
  const items = []
  for (const [slug, vEn] of Object.entries(metaEn)) {
    if (typeof vEn === 'object' && vEn.display === 'hidden') continue
    items.push({
      title:
        metaTitle(metaLocale, slug) ??
        metaTitle(metaEn, slug) ??
        humanize(slug),
      path: `${section}/${slug}`,
    })
  }
  if (items.length === 0) return []
  // A blank group title marks a "flat" section — the Sidebar/Breadcrumb skip the
  // redundant section-named header + crumb (matching live napi.rs), unlike the
  // real multi-group docs sidebar.
  return [{ group: section, title: '', items }]
}

function buildBlogSidebar(locale) {
  return buildFlatSidebar('blog', locale)
}

function buildChangelogSidebar(locale) {
  return buildFlatSidebar('changelog', locale)
}

function buildLocaleNav(locale) {
  const topMeta = readMeta(contentRoot, locale)

  // Tabs: type:page entries only (exclude display:hidden and raw layout)
  const tabs = []
  for (const [key, value] of Object.entries(topMeta)) {
    if (typeof value === 'object' && value.type === 'page') {
      tabs.push({ key, title: value.title })
    }
  }

  const sidebar = {
    docs: buildDocsSidebar(locale),
    blog: buildBlogSidebar(locale),
    changelog: buildChangelogSidebar(locale),
  }

  return { tabs, sidebar }
}

const nav = {}
for (const locale of LOCALES) {
  nav[locale] = buildLocaleNav(locale)
}

const locales = LOCALES.map((l) => ({ locale: l, text: LOCALE_LABELS[l] }))

// Generate TypeScript output
const ts = `// AUTO-GENERATED by scripts/build-nav.mjs — do not edit by hand.
// Re-run: node scripts/build-nav.mjs

export interface NavLeaf {
  title: string
  path: string
}

export interface NavGroup {
  group: string
  /**
   * Display label for the group header. A BLANK title ('') marks a "flat" group:
   * its leaves are rendered directly (no collapsible sidebar header, no group
   * breadcrumb crumb), matching live napi.rs for blog/changelog whose source
   * _meta is a flat slug->title map. Docs groups always carry a real title.
   */
  title: string
  items: NavLeaf[]
}

export interface NavTab {
  key: string
  title: string
  href?: string
}

export interface LocaleNav {
  tabs: NavTab[]
  /** Sidebar groups keyed by tab key ('docs' | 'blog' | 'changelog'). */
  sidebar: Record<string, NavGroup[]>
}

export type Locale = 'en' | 'cn' | 'pt-BR'

export const nav: Record<Locale, LocaleNav> = ${JSON.stringify(nav, null, 2)} as const

export const locales: { locale: Locale; text: string }[] = ${JSON.stringify(locales, null, 2)} as const
`

writeFileSync(outFile, ts, 'utf8')
// Auto-format so the committed file matches what `vp fmt` would produce (uses oxfmt).
try {
  execSync(`vp fmt "${outFile}" --write`, { cwd: root, stdio: 'pipe' })
} catch {
  // vp not on PATH; file will be formatted by pre-commit hook
}
console.log(`Written ${outFile}`)
