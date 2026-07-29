// Generate lib/docs/lastmod.gen.json — per-page last-modified dates + top
// contributors, derived from git history.
//
// Why a generated file: the docs footer ("Last updated …", contributor
// avatars) needs git metadata at RUNTIME, but the deployed worker has no git
// repo. So we bake it at build/dev time into a committed-style JSON the
// frontend imports directly. en is the canonical source (keys are the
// locale-independent unprefixed leaves: `docs/concepts/enum`, `blog/…`).
//
// Idempotent: the file is only rewritten when the content actually changes, so
// dev servers / watchers don't loop. Runs via lastmodPlugin() (vite.config.ts)
// on buildStart + dev server start, or standalone:
//   node scripts/build-lastmod.mjs

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

export const ROOT = join(import.meta.dirname, '..')
export const EN_PAGES_DIR = join(ROOT, 'pages', 'en')
export const OUT_PATH = join(ROOT, 'lib', 'docs', 'lastmod.gen.json')

export const MAX_CONTRIBUTORS = 5

/**
 * Map a git author email to an avatar URL:
 *   12345+user@users.noreply.github.com -> https://avatars.githubusercontent.com/u/12345?v=4
 *   user@users.noreply.github.com       -> https://github.com/user.png
 *   anything else                       -> Gravatar (md5 of the normalised
 *     address, `d=identicon` so even unregistered addresses get a stable
 *     geometric avatar instead of a broken image). Empty email -> undefined.
 */
export function avatarForEmail(email) {
  let m = /^(\d+)\+[^@]+@users\.noreply\.github\.com$/.exec(email)
  if (m) return `https://avatars.githubusercontent.com/u/${m[1]}?v=4`
  m = /^([^@+]+)@users\.noreply\.github\.com$/.exec(email)
  if (m) return `https://github.com/${m[1]}.png`
  const normalized = email.trim().toLowerCase()
  if (!normalized) return undefined
  const hash = createHash('md5').update(normalized).digest('hex')
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=64`
}

/**
 * Aggregate `git log --format=%aN|%aE` lines (newest commit first, git's
 * default order) into the top-N contributor list: most commits first, ties
 * broken by who committed to the file EARLIEST first. Name is the author's
 * most recent %aN. Entries keep the email; buildLastmodMap turns it into an
 * avatar (or drops the key) via avatarForEmail.
 */
export function aggregateContributors(logLines, max = MAX_CONTRIBUTORS) {
  const byEmail = new Map()
  logLines.forEach((line, index) => {
    const sep = line.lastIndexOf('|')
    if (sep === -1) return
    const name = line.slice(0, sep)
    const email = line.slice(sep + 1)
    if (!email) return
    let agg = byEmail.get(email)
    if (!agg) {
      agg = { name, email, count: 0, firstCommitIndex: -1 }
      byEmail.set(email, agg)
    }
    agg.name = name // newest-first iteration: keep the most recent name
    agg.count++
    // Lines are newest-first, so the LAST index we see is the author's
    // earliest commit on this file.
    agg.firstCommitIndex = index
  })
  return [...byEmail.values()]
    .sort(
      (a, b) => b.count - a.count || b.firstCommitIndex - a.firstCommitIndex,
    )
    .slice(0, max)
}

/** Public contributor shape: `{ name, avatar? }` — avatar only when mappable. */
export function toContributor({ name, email }) {
  const entry = { name }
  const avatar = avatarForEmail(email)
  if (avatar) entry.avatar = avatar
  return entry
}

/**
 * Pure core: files = repo-relative page paths (e.g.
 * 'pages/en/docs/concepts/enum.md', 'pages/cn/docs/concepts/enum.md'),
 * gitInfo(file) = { lastmod, authorLines } (injectable for tests; the real
 * one shells out to git). Returns a leaf → entry map for ONE locale.
 */
export function buildLastmodMap(files, gitInfo) {
  const map = {}
  for (const file of files) {
    const info = gitInfo(file)
    if (!info?.lastmod) continue // no git history (untracked) — skip
    const leaf = file
      .replace(/\\/g, '/')
      .replace(/^pages\/(en|cn|pt-BR)\//, '')
      .replace(/\.md$/, '')
    map[leaf] = {
      lastmod: info.lastmod,
      contributors: aggregateContributors(info.authorLines ?? []).map(
        toContributor,
      ),
    }
  }
  return map
}

export function renderLastmodJson(map) {
  return JSON.stringify(map, null, 2) + '\n'
}

/** List every md file under a locale pages dir as repo-relative POSIX paths. */
export function collectLocalePages(locale, root = ROOT) {
  const out = []
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.name.endsWith('.md')) out.push(p)
    }
  }
  walk(join(root, 'pages', locale))
  return out.map((abs) => relative(root, abs).replace(/\\/g, '/')).sort()
}

/** Kept for backwards compatibility with existing tests/imports. */
export function collectEnPages(enPagesDir = EN_PAGES_DIR, root = ROOT) {
  void enPagesDir
  return collectLocalePages('en', root)
}

/**
 * The per-locale lastmod map: { en: {...}, cn: {...}, 'pt-BR': {...} }.
 * Localized pages carry their OWN history (a retranslated cn page shows the
 * retranslation date/authors, not the English original's); the frontend falls
 * back to the en entry for untranslated (fallback-rendered) pages.
 */
export function buildAllLastmodMaps(gitInfo = gitInfoForFile) {
  const all = {}
  for (const locale of ['en', 'cn', 'pt-BR']) {
    all[locale] = buildLastmodMap(collectLocalePages(locale), gitInfo)
  }
  return all
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

/** Real gitInfo: lastmod from `git log -1 --format=%cI`, authors from full log. */
export function gitInfoForFile(file) {
  let lastmod = ''
  let authorLines = []
  try {
    lastmod = git(['log', '-1', '--format=%cI', '--', file])
    const authors = git(['log', '--format=%aN|%aE', '--', file])
    authorLines = authors ? authors.split('\n') : []
  } catch {
    return undefined // not a git checkout / file never committed
  }
  if (!lastmod) return undefined
  return { lastmod, authorLines }
}

/** True when the checkout is shallow (CI default) — git-log metadata then
 * collapses to the fetch commit, making lastmod/contributors meaningless. */
export function isShallowRepo() {
  try {
    return git(['rev-parse', '--is-shallow-repository']) === 'true'
  } catch {
    return false
  }
}

/** Write OUT_PATH only when the content changed. Returns true when written. */
export function writeLastmodIfChanged(outPath = OUT_PATH, map, gitInfo) {
  if (isShallowRepo()) {
    console.warn(
      '[lastmod] WARNING: shallow git checkout — lastmod/contributors collapse ' +
        'to the fetch commit. Set `fetch-depth: 0` on actions/checkout in CI.',
    )
  }
  const data = map ?? buildAllLastmodMaps(gitInfo ?? gitInfoForFile)
  const content = renderLastmodJson(data)
  const count = Object.values(data).reduce(
    (n, m) => n + Object.keys(m).length,
    0,
  )
  if (existsSync(outPath) && readFileSync(outPath, 'utf8') === content) {
    return { written: false, count }
  }
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, content)
  return { written: true, count }
}

/**
 * Vite plugin: keep lib/docs/lastmod.gen.json fresh at build (buildStart) and
 * dev (server start) time. The write is idempotent so dev watch loops never
 * trigger from our own output.
 */
export function lastmodPlugin() {
  const run = () => {
    const { written, count } = writeLastmodIfChanged()
    if (written)
      console.log(
        `[lastmod] regenerated lib/docs/lastmod.gen.json (${count} pages)`,
      )
  }
  return {
    name: 'napi-rs-lastmod',
    buildStart: run,
    configureServer: run,
  }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const { written, count } = writeLastmodIfChanged()
  console.log(
    written
      ? `[lastmod] wrote ${OUT_PATH} (${count} pages)`
      : `[lastmod] up to date (${count} pages)`,
  )
}
