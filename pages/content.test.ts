// @vitest-environment node
//
// Structural test for the prose-content conversion (Task 4a).
// Asserts that scripts/convert-content.mjs produced a complete, clean
// pages/<locale>/docs/**/*.md tree that agrees with the nav manifest.
//
// Run: GITHUB_TOKEN=dummy vp test run pages/content.test.ts
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vite-plus/test'
import { nav } from '../lib/nav/index.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const legacyDocs = join(root, 'legacy_pages', 'docs')
const pagesDir = join(root, 'pages')

const LOCALES = ['en', 'cn', 'pt-BR'] as const

// Must mirror the EXCLUDED_ROUTES in scripts/convert-content.mjs.
const EXCLUDED_ROUTES = new Set(['concepts/webassembly'])

const FENCE_RE = /^\s*(```+|~~~+)/

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (name.endsWith('.mdx') || name.endsWith('.md')) out.push(full)
  }
  return out
}

/** All in-scope legacy files as { routePath, locale }. */
function inScopeLegacy(): { routePath: string; locale: string }[] {
  const result: { routePath: string; locale: string }[] = []
  for (const full of walk(legacyDocs)) {
    const rel = relative(legacyDocs, full).replace(/\\/g, '/')
    const m = rel.match(/^(.+)\.(en|cn|pt-BR)\.(mdx|md)$/)
    if (!m) continue
    const [, routePath, locale] = m
    if (EXCLUDED_ROUTES.has(routePath)) continue
    result.push({ routePath, locale })
  }
  return result
}

/** All emitted page files as absolute paths. */
function emittedPages(): string[] {
  const out: string[] = []
  for (const locale of LOCALES) {
    const dir = join(pagesDir, locale, 'docs')
    if (existsSync(dir)) out.push(...walk(dir))
  }
  return out
}

/** Set of nav leaf paths (e.g. "docs/concepts/class") for a locale. */
function navLeafPaths(locale: string): Set<string> {
  const set = new Set<string>()
  const localeNav = nav[locale as keyof typeof nav]
  for (const groups of Object.values(localeNav.sidebar)) {
    for (const group of groups) {
      for (const leaf of group.items) set.add(leaf.path)
    }
  }
  return set
}

describe('converted content tree', () => {
  it('every in-scope legacy file has a corresponding emitted .md', () => {
    for (const { routePath, locale } of inScopeLegacy()) {
      const out = join(pagesDir, locale, 'docs', `${routePath}.md`)
      expect(
        existsSync(out),
        `missing: pages/${locale}/docs/${routePath}.md`,
      ).toBe(true)
    }
  })

  it('count of emitted pages equals count of in-scope legacy files', () => {
    expect(emittedPages().length).toBe(inScopeLegacy().length)
  })

  it('no emitted page contains a leftover island tag or top-level import', () => {
    const FORBIDDEN =
      /<Callout\b|<\/Callout>|<NodeLink\b|<\/NodeLink>|<Green>|<\/Green>|<Rust>|<\/Rust>|<Warning>|<\/Warning>/
    for (const file of emittedPages()) {
      const lines = readFileSync(file, 'utf8').split('\n')
      let inFence = false
      let fm = false
      let fmDone = false
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const t = line.trim()
        if (i === 0 && t === '---') {
          fm = true
          continue
        }
        if (fm && !fmDone && t === '---') {
          fmDone = true
          continue
        }
        if (fm && !fmDone) continue
        if (FENCE_RE.test(line)) {
          inFence = !inFence
          continue
        }
        if (inFence) continue
        expect(
          /^import\s/.test(line),
          `top-level import leaked in ${relative(root, file)}:${i + 1}`,
        ).toBe(false)
        expect(
          FORBIDDEN.test(line),
          `island tag leaked in ${relative(root, file)}:${i + 1}: ${t.slice(0, 60)}`,
        ).toBe(false)
      }
    }
  })

  it('no emitted page contains a leaked or mangled MDX comment', () => {
    // MDX comments `{/* ... */}` are invisible when rendered by Nextra/MDX, but
    // @void/md is plain markdown: a leaked comment renders as visible text, and
    // `vp fmt` mangles its `*` into emphasis -> `{/_ ... _/}`. Legitimate markdown
    // never contains these substrings, so a whole-file scan is a safe guard.
    const MARKERS = ['{/*', '*/}', '{/_', '_/}']
    for (const file of emittedPages()) {
      const content = readFileSync(file, 'utf8')
      for (const marker of MARKERS) {
        expect(
          content.includes(marker),
          `leaked MDX comment marker ${JSON.stringify(marker)} in ${relative(root, file)}`,
        ).toBe(false)
      }
    }
  })

  it('no emitted fence meta retains filename=', () => {
    for (const file of emittedPages()) {
      const content = readFileSync(file, 'utf8')
      for (const line of content.split('\n')) {
        if (FENCE_RE.test(line)) {
          expect(
            /filename\s*=/.test(line),
            `filename= leaked in ${relative(root, file)}: ${line}`,
          ).toBe(false)
        }
      }
    }
  })

  it('every emitted page route appears as a nav leaf for its locale (or is documented)', () => {
    // Known in-scope pages that exist as content but are intentionally absent
    // from the nav manifest for their locale (the _meta files simply do not list
    // them — they are reachable by direct URL but not in the sidebar). Documented
    // here so the test stays a real guard rather than a rubber stamp.
    // These in-scope content pages exist on disk and are reachable by direct URL
    // but are NOT sidebar leaves because their slug is absent from the relevant
    // _meta.<locale>.json (so scripts/build-nav.mjs never emits a nav leaf). This
    // is a documented divergence, verified against the legacy _meta files.
    const KNOWN_NOT_IN_NAV: Record<string, Set<string>> = {
      en: new Set([
        // cli/_meta.en.json lists only programmatic-api/build/artifacts/pre-publish/napi-config
        'docs/cli/create-npm-dirs',
        'docs/cli/new',
        'docs/cli/rename',
        'docs/cli/universalize',
        'docs/cli/version',
      ]),
      // 'promise' content exists for cn/pt-BR but is absent from concepts/_meta.{cn,pt-BR}.json
      cn: new Set(['docs/concepts/promise']),
      'pt-BR': new Set(['docs/concepts/promise']),
    }

    for (const locale of LOCALES) {
      const leaves = navLeafPaths(locale)
      const known = KNOWN_NOT_IN_NAV[locale] ?? new Set<string>()
      const dir = join(pagesDir, locale, 'docs')
      if (!existsSync(dir)) continue
      for (const file of walk(dir)) {
        const routePath =
          'docs/' +
          relative(join(pagesDir, locale, 'docs'), file)
            .replace(/\\/g, '/')
            .replace(/\.md$/, '')
        const ok = leaves.has(routePath) || known.has(routePath)
        expect(
          ok,
          `emitted page ${locale}/${routePath} is neither a nav leaf nor a documented exception`,
        ).toBe(true)
      }
    }
  })

  it('every nav docs leaf with an in-scope content file has an emitted page', () => {
    for (const locale of LOCALES) {
      for (const group of nav[locale as keyof typeof nav].sidebar.docs) {
        for (const leaf of group.items) {
          const routePath = leaf.path.replace(/^docs\//, '') // concepts/class
          if (EXCLUDED_ROUTES.has(routePath)) continue // getting-started/webassembly: later task
          const out = join(pagesDir, locale, 'docs', `${routePath}.md`)
          expect(
            existsSync(out),
            `nav leaf ${locale} ${leaf.path} has no emitted page`,
          ).toBe(true)
        }
      }
    }
  })

  it('every emitted page has a non-empty frontmatter title', () => {
    // void.json's titleTemplate "%s – NAPI-RS" leaves an EMPTY <title> when a
    // page has no frontmatter `title` (no %s substitution). The converter
    // injects a title (first H1, else the legacy _meta title, else the first
    // heading) so this can never silently regress.
    for (const file of emittedPages()) {
      const content = readFileSync(file, 'utf8')
      const lines = content.split('\n')
      expect(
        lines[0]?.trim() === '---',
        `no frontmatter block in ${relative(root, file)}`,
      ).toBe(true)
      let title: string | null = null
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') break
        const m = lines[i].match(/^title\s*:\s*(.+?)\s*$/)
        if (m) {
          // Unwrap a single/double-quoted scalar to check the inner value.
          let v = m[1]
          if (
            (v.startsWith("'") && v.endsWith("'")) ||
            (v.startsWith('"') && v.endsWith('"'))
          ) {
            v = v.slice(1, -1)
          }
          title = v.trim()
          break
        }
      }
      expect(title, `no frontmatter title in ${relative(root, file)}`).not.toBe(
        null,
      )
      expect(
        (title ?? '').length > 0,
        `empty frontmatter title in ${relative(root, file)}`,
      ).toBe(true)
    }
  })

  it('spot-check: H1-less pages get a title from the legacy _meta', () => {
    // concepts/env and more/v2-v3-migration-guide start at H2 (no H1); their
    // titles must come from the legacy _meta.<locale>.json.
    const env = readFileSync(
      join(pagesDir, 'en', 'docs', 'concepts', 'env.md'),
      'utf8',
    )
    expect(env).toMatch(/^---\ntitle: 'Env'\n/)
    const mig = readFileSync(
      join(pagesDir, 'en', 'docs', 'more', 'v2-v3-migration-guide.md'),
      'utf8',
    )
    expect(mig).toMatch(/^---\ntitle: 'V2 to V3 Migration Guide'\n/)
  })

  it('spot-check: a title derived from an H1 strips inline markdown', () => {
    // concepts/reference keeps its legacy `title: Reference`; cli/build derives
    // `Build` from its `# Build` H1 (no title in legacy frontmatter).
    const build = readFileSync(
      join(pagesDir, 'en', 'docs', 'cli', 'build.md'),
      'utf8',
    )
    expect(build).toMatch(/^---\ntitle: 'Build'\n/)
  })

  it('spot-check: en concepts/enum has ::: warning and no <Callout', () => {
    const enumMd = readFileSync(
      join(pagesDir, 'en', 'docs', 'concepts', 'enum.md'),
      'utf8',
    )
    expect(enumMd).toContain('::: warning')
    expect(enumMd).not.toContain('<Callout')
  })

  it('spot-check: en concepts/reference converts a multi-line NodeLink to a markdown link', () => {
    const refMd = readFileSync(
      join(pagesDir, 'en', 'docs', 'concepts', 'reference.md'),
      'utf8',
    )
    expect(refMd).not.toContain('<NodeLink')
    expect(refMd).toContain(
      '[`napi_wrap`](https://nodejs.org/api/n-api.html#napi_wrap)',
    )
  })

  it('spot-check: en cli/build converts chalk in a table cell to a lowercase span', () => {
    const buildMd = readFileSync(
      join(pagesDir, 'en', 'docs', 'cli', 'build.md'),
      'utf8',
    )
    expect(buildMd).not.toContain('<Green>')
    expect(buildMd).toContain('<span class="chalk-green">')
  })

  it('regression: introduction/getting-started exists per locale with a video and title', () => {
    // The legacy MDX imported a .mp4 and embedded a JSX <video> with an inline
    // style object + `src={Video}` expression. The converter drops the import,
    // collapses the JSX <video> into raw HTML pointing at the statically-served
    // asset, and rewrites the co-located ./package-template.png to /assets/.
    for (const locale of LOCALES) {
      const file = join(
        pagesDir,
        locale,
        'docs',
        'introduction',
        'getting-started.md',
      )
      expect(existsSync(file), `missing getting-started.md for ${locale}`).toBe(
        true,
      )
      const content = readFileSync(file, 'utf8')

      // Raw-HTML <video> pointing at the served asset; no leftover JSX.
      expect(content).toContain(
        '<video controls style="width: 100%"><source src="/assets/napi-rs-guide.mp4" type="video/mp4" /></video>',
      )
      expect(content).not.toContain('src={Video}')
      expect(content).not.toContain('import Video')
      expect(content).not.toContain('<track')

      // Co-located image rewritten to the served /assets/ path (no ./ relative).
      expect(content).toContain(
        '![package-template](/assets/package-template.png)',
      )
      expect(content).not.toContain('./package-template.png')

      // Non-empty frontmatter title.
      const lines = content.split('\n')
      expect(lines[0]?.trim()).toBe('---')
      let title: string | null = null
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') break
        const m = lines[i].match(/^title\s*:\s*(.+?)\s*$/)
        if (m) {
          let v = m[1]
          if (
            (v.startsWith("'") && v.endsWith("'")) ||
            (v.startsWith('"') && v.endsWith('"'))
          ) {
            v = v.slice(1, -1)
          }
          title = v.trim()
          break
        }
      }
      expect(
        (title ?? '').length > 0,
        `empty getting-started title for ${locale}`,
      ).toBe(true)
    }

    // The served video asset actually exists in public/assets.
    expect(
      existsSync(join(root, 'public', 'assets', 'napi-rs-guide.mp4')),
    ).toBe(true)
    expect(
      existsSync(join(root, 'public', 'assets', 'package-template.png')),
    ).toBe(true)

    // pt-BR carries the extra IDE-support section that en/cn lack.
    const ptbr = readFileSync(
      join(pagesDir, 'pt-BR', 'docs', 'introduction', 'getting-started.md'),
      'utf8',
    )
    expect(ptbr).toContain('#### Problema de suporte ao IDE')
  })
})
