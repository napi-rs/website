// @vitest-environment node
//
// Structural test for the prose-content conversion (Task 4a).
// Asserts that scripts/convert-content.mjs produced a complete, clean
// pages/<locale>/docs/**/*.md tree that agrees with the nav manifest.
//
// Run: GITHUB_TOKEN=dummy vp test run pages/content.test.ts
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, it, expect } from 'vite-plus/test'
import { nav } from '../lib/nav/index.ts'
import {
  convert,
  WEBASSEMBLY_ROUTE,
  assertLinkPreviewEntry,
} from '../scripts/convert-content.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const legacyDocs = join(root, 'legacy_pages', 'docs')
const pagesDir = join(root, 'pages')

const LOCALES = ['en', 'cn', 'pt-BR'] as const

// Must mirror the EXCLUDED_ROUTES in scripts/convert-content.mjs (now empty:
// concepts/webassembly is converted with route-gated island rewrites).
const EXCLUDED_ROUTES = new Set<string>([])

const FENCE_RE = /^\s*(```+|~~~+)/

// @void/md island pages lead with a `<script>...</script>` block at byte 0 (it
// MUST precede the frontmatter so the plugin's start-anchored extractScript
// strips it). Mirror that strip here so the frontmatter/import scanners below see
// the same `---\ntitle...` body the @void/md compiler does. Returns { script,
// body }: `body` is the post-script remainder, `scriptLineCount` is how many
// lines the script block (plus its trailing blank) occupied (for line-number
// reporting).
const SCRIPT_RE = /^<script\b[^>]*>([\s\S]*?)<\/script>\s*\n?/
function stripLeadingScript(content: string): {
  script: string | null
  body: string
  scriptLineCount: number
} {
  const m = content.match(SCRIPT_RE)
  if (!m) return { script: null, body: content, scriptLineCount: 0 }
  const consumed = m[0]
  return {
    script: m[1].trim(),
    body: content.slice(consumed.length),
    scriptLineCount: consumed.split('\n').length - 1,
  }
}

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
      // Strip the leading <script> island block (its `import ... with { island }`
      // line is intentional, not a leak) before scanning the markdown body.
      const { body, scriptLineCount } = stripLeadingScript(
        readFileSync(file, 'utf8'),
      )
      const lineOffset = scriptLineCount
      const lines = body.split('\n')
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
          `top-level import leaked in ${relative(root, file)}:${i + 1 + lineOffset}`,
        ).toBe(false)
        expect(
          FORBIDDEN.test(line),
          `island tag leaked in ${relative(root, file)}:${i + 1 + lineOffset}: ${t.slice(0, 60)}`,
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
          if (EXCLUDED_ROUTES.has(routePath)) continue // none currently excluded
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
      // Island pages lead with a <script> block before the frontmatter; strip it
      // so the `---` is the first body line, matching what @void/md parses.
      const { body } = stripLeadingScript(readFileSync(file, 'utf8'))
      const lines = body.split('\n')
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

describe('converter media rewrites are route-scoped', () => {
  // Synthetic input reproducing getting-started's JSX <video> + co-located image.
  const VIDEO_BLOCK = [
    "<video controls style={{ width: '100%' }}>",
    '<source src={Video} type="video/mp4" />',
    '</video>',
  ].join('\n')

  it('off-route: a <video> and ./package-template.png pass through untouched', () => {
    const src = [
      '# Heading',
      '',
      VIDEO_BLOCK,
      '',
      '![x](./package-template.png)',
      '',
    ].join('\n')
    const out = convert(src, 'Heading', 'concepts/foo')
    // The video rewrite did NOT fire off-route.
    expect(out).not.toContain('/assets/napi-rs-guide.mp4')
    // The image rewrite did NOT fire off-route.
    expect(out).not.toContain('/assets/package-template.png')
  })

  it('on-route: the <video> block and image destination are rewritten', () => {
    const src = [
      '# Heading',
      '',
      VIDEO_BLOCK,
      '',
      '![x](./package-template.png)',
      '',
    ].join('\n')
    const out = convert(src, 'Heading', 'introduction/getting-started')
    expect(out).toContain(
      '<video controls style="width: 100%"><source src="/assets/napi-rs-guide.mp4" type="video/mp4" /></video>',
    )
    expect(out).toContain('](/assets/package-template.png)')
  })

  it('on-route: fenced <video> and ./package-template.png stay literal inside the fence', () => {
    const src = [
      '# Heading',
      '',
      '```html',
      '<video controls>',
      './package-template.png',
      '```',
      '',
    ].join('\n')
    const out = convert(src, 'Heading', 'introduction/getting-started')
    // Untouched inside the fence: no rewrite to the served asset paths.
    expect(out).toContain('<video controls>')
    expect(out).toContain('./package-template.png')
    expect(out).not.toContain('/assets/napi-rs-guide.mp4')
    expect(out).not.toContain('/assets/package-template.png')
  })

  it('on-route: a prose mention of ./package-template.png (not image syntax) is NOT rewritten', () => {
    const src = [
      '# Heading',
      '',
      'the file ./package-template.png is the template.',
      '',
    ].join('\n')
    const out = convert(src, 'Heading', 'introduction/getting-started')
    expect(out).toContain('the file ./package-template.png is the template.')
    expect(out).not.toContain('/assets/package-template.png')
  })
})

describe('webassembly slice', () => {
  const wasmMd = readFileSync(
    join(pagesDir, 'en', 'docs', 'concepts', 'webassembly.md'),
    'utf8',
  )

  it('leads with exactly one <script> default-island import of LinkPreview', () => {
    // The block MUST be at byte 0 (before the frontmatter): @void/md's
    // extractScript anchors its SCRIPT_RE at the file start (no /m flag), so a
    // script-after-frontmatter layout never registers the island.
    const opens = wasmMd.match(/<script\b/g) ?? []
    const closes = wasmMd.match(/<\/script>/g) ?? []
    expect(opens.length, 'exactly one <script> open').toBe(1)
    expect(closes.length, 'exactly one </script> close').toBe(1)
    expect(wasmMd.startsWith('<script>')).toBe(true)

    const { script, body } = stripLeadingScript(wasmMd)
    expect(script).not.toBe(null)
    // Default import (no braces), relative specifier, island strategy "visible".
    expect(script).toMatch(
      /^import\s+LinkPreview\s+from\s+"\.\.\/\.\.\/\.\.\/\.\.\/components\/link-preview\.tsx"\s+with\s*\{\s*island\s*:\s*"visible"\s*\}$/,
    )
    // The frontmatter survives intact as the start of the post-script body.
    expect(body.startsWith('---\ntitle: ')).toBe(true)
  })

  it('emits exactly two LinkPreview island tags whose data deserializes', () => {
    // Parse each tag the way the @void/md runtime will: pull the single-quoted
    // `data` attribute value and JSON.parse it (the `'` escapes round-trip).
    const re = /<LinkPreview\s+href="([^"]*)"\s+data='([\s\S]*?)'\s*\/>/g
    const found: string[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(wasmMd)) !== null) {
      const href = m[1]
      const data = m[2]
      // The single-quoted attribute must contain no raw apostrophe (it would
      // terminate the attribute early); all `'` are escaped to `'`.
      expect(
        data.includes("'"),
        `raw apostrophe in data attr for ${href}`,
      ).toBe(false)
      const parsed = JSON.parse(data) as Record<string, unknown>
      expect(Object.keys(parsed).sort()).toEqual(['json', 'og', 'userAvatar'])
      expect(typeof parsed.og).toBe('string')
      expect((parsed.og as string).length).toBeGreaterThan(0)
      expect(typeof parsed.userAvatar).toBe('string')
      expect((parsed.userAvatar as string).length).toBeGreaterThan(0)
      found.push(href)
    }
    expect(found.length, 'exactly two LinkPreview island tags').toBe(2)
    expect(found.sort()).toEqual([
      'https://blog.mozilla.org/security/2018/01/03/mitigations-landing-new-class-timing-attack/',
      'https://github.com/napi-rs/napi-rs/issues/1794',
    ])
  })

  it('rewrites all five logo imgs to static /assets paths (no {X.src} left)', () => {
    expect(wasmMd).toContain('<img src="/assets/vite.svg"')
    expect(wasmMd).toContain('<img src="/assets/webpack.svg"')
    expect(wasmMd).toContain('<img src="/assets/yarn.svg"')
    expect(wasmMd).toContain('<img src="/assets/pnpm.svg"')
    expect(wasmMd).toContain('<img src="/assets/npm.png"')
    // No leftover JSX `src={X.src}` expressions anywhere.
    expect(wasmMd).not.toMatch(/\.src\}/)
    expect(wasmMd).not.toMatch(/src=\{[A-Za-z]/)
  })

  it('converts inline JSX-isms (style={{}} -> style="", className -> class)', () => {
    // @void/md renders plain-markdown HTML: markdown-it ESCAPES any tag whose
    // attributes use a JSX `style={{ ... }}` object (the whole <a> would leak as
    // visible text), and `className=` is inert in real HTML (the Tailwind color
    // class never applies). Assert no such JSX-ism survives outside code fences.
    const { body } = stripLeadingScript(wasmMd)
    let inFence = false
    for (const line of body.split('\n')) {
      if (FENCE_RE.test(line)) {
        inFence = !inFence
        continue
      }
      if (inFence) continue
      expect(
        line.includes('style={{'),
        `JSX style object leaked: ${line.trim().slice(0, 80)}`,
      ).toBe(false)
      expect(
        line.includes('className='),
        `className leaked: ${line.trim().slice(0, 80)}`,
      ).toBe(false)
    }
    // Positive: the course-link <a> kept its styling as a CSS string (so the tag
    // is valid HTML and renders as a real anchor), and the bundler labels kept
    // their color class.
    expect(wasmMd).toContain(
      '<a style="color: var(--color-indigo-400); text-decoration-line: underline" href="https://learn-wasm.dev/?via=brooklyn" target="_blank">',
    )
    expect(wasmMd).toContain('<span class="text-violet-500">Vite</span>')
    expect(wasmMd).toContain('<span class="text-sky-500">Webpack</span>')
  })

  it('drops getStaticProps / top-level imports / TransformImage from the body', () => {
    const { body } = stripLeadingScript(wasmMd)
    expect(body).not.toContain('getStaticProps')
    // No `export const` (the getStaticProps loader) anywhere in the body.
    expect(body).not.toMatch(/^\s*export const\b/m)
    expect(body).not.toContain('<TransformImage')
    // No top-level `import ` leak outside code fences (the only import is in the
    // leading <script>, already stripped from `body`).
    const lines = body.split('\n')
    let inFence = false
    let fmDone = false
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const t = line.trim()
      if (i === 0 && t === '---') continue
      if (!fmDone && t === '---') {
        fmDone = true
        continue
      }
      if (!fmDone) continue
      if (FENCE_RE.test(line)) {
        inFence = !inFence
        continue
      }
      if (inFence) continue
      expect(
        /^import\s/.test(line),
        `top-level import leaked at body line ${i + 1}: ${t.slice(0, 60)}`,
      ).toBe(false)
    }
  })

  it('replaces the demo with the ::: info Interactive demo fallback', () => {
    expect(wasmMd).toContain('::: info Interactive demo')
    expect(wasmMd).toContain(
      'runs on cross-origin-isolated pages — see [Server configuration](#server-configuration) below',
    )
  })

  it('throws on a LinkPreview href absent from the fixture (before any write)', () => {
    // A WebAssembly source that references an href the fixture does not cover
    // must fail the conversion (so main()'s preflight catches it before the
    // destructive clean) rather than silently emit a broken island.
    const src = [
      '# Heading',
      '',
      '<LinkPreview href="https://example.test/not-in-fixture" />',
      '',
    ].join('\n')
    expect(() => convert(src, 'Heading', WEBASSEMBLY_ROUTE)).toThrow(
      /fixture entry for href .* is missing or malformed/,
    )
  })

  it('assertLinkPreviewEntry rejects missing/malformed entries, accepts a complete one', () => {
    const complete = {
      json: {
        title: 't',
        body: 'b',
        user: { login: 'l' },
        repoUrl: 'r',
      },
      og: 'AAAA',
      userAvatar: 'BBBB',
    }
    expect(() => assertLinkPreviewEntry('h', complete)).not.toThrow()
    // Each of these is a "truthy but malformed" entry that a laxer guard would
    // have waved through into a broken island.
    expect(() => assertLinkPreviewEntry('h', undefined)).toThrow()
    expect(() => assertLinkPreviewEntry('h', {})).toThrow()
    expect(() => assertLinkPreviewEntry('h', { ...complete, og: '' })).toThrow()
    expect(() =>
      assertLinkPreviewEntry('h', { ...complete, userAvatar: undefined }),
    ).toThrow()
    expect(() =>
      assertLinkPreviewEntry('h', {
        ...complete,
        json: { ...complete.json, user: {} },
      }),
    ).toThrow()
    // Whitespace-only fields are NOT usable (blank card / invalid image URL).
    expect(() =>
      assertLinkPreviewEntry('h', { ...complete, og: '   ' }),
    ).toThrow()
    expect(() =>
      assertLinkPreviewEntry('h', {
        ...complete,
        json: { ...complete.json, title: '  \t ' },
      }),
    ).toThrow()
    // Arrays and inherited (non-own) fields must not satisfy the shape check.
    expect(() => assertLinkPreviewEntry('h', [])).toThrow()
    expect(() =>
      assertLinkPreviewEntry('h', { ...complete, json: [] }),
    ).toThrow()
    expect(() => assertLinkPreviewEntry('h', Object.create(complete))).toThrow()
  })

  it('convert() is self-idempotent on the WebAssembly route (no duplicate script/frontmatter)', () => {
    // The emitted island page begins with a `<script>` block (which a legacy
    // .mdx source never does). Feeding converted output back through convert()
    // must NOT strip the island import, re-add frontmatter, or prepend a second
    // <script>. Guards the function-level idempotency the byte-0 injection
    // depends on (the workflow re-reads pristine source, but this is the strict
    // invariant).
    const src = readFileSync(
      join(legacyDocs, 'concepts', 'webassembly.en.mdx'),
      'utf8',
    )
    const once = convert(src, 'WebAssembly', WEBASSEMBLY_ROUTE)
    const twice = convert(once, 'WebAssembly', WEBASSEMBLY_ROUTE)
    expect(twice).toBe(once)
    // Exactly one leading island <script> and one frontmatter delimiter pair.
    expect(twice.startsWith('<script>')).toBe(true)
    expect((twice.match(/<script\b/g) ?? []).length).toBe(1)
    expect((twice.match(/^---$/gm) ?? []).length).toBe(2)
  })
})

describe('converter webassembly rewrites are route-scoped', () => {
  // Synthetic source carrying the three WebAssembly-only JSX constructs.
  const OFF_ROUTE_SRC = [
    'export const getStaticProps = async () => {',
    '  return { props: { ssg: {} } }',
    '}',
    '',
    '# Heading',
    '',
    "<img src={ViteLogo.src} style={{ verticalAlign: 'text-bottom' }} width={20} height={20} />",
    '',
    '<a style={{ color: \'red\' }} href="https://x.test">link</a>',
    '<span className="text-violet-500">Vite</span>',
    '',
    '<LinkPreview href="https://github.com/napi-rs/napi-rs/issues/1794" />',
    '',
  ].join('\n')

  it('off-route: getStaticProps, logo img, JSX-isms, and LinkPreview pass through untouched', () => {
    // A non-webassembly route must NOT trigger any of the island rewrites. (The
    // generic top-level-import stripper does not touch `export const` or these
    // JSX tags, so they survive verbatim.)
    const out = convert(OFF_ROUTE_SRC, 'Heading', 'concepts/foo')
    expect(out).toContain('export const getStaticProps')
    expect(out).toContain('<img src={ViteLogo.src}')
    expect(out).not.toContain('/assets/vite.svg')
    // JSX style object and className survive untouched off-route.
    expect(out).toContain("<a style={{ color: 'red' }}")
    expect(out).toContain('<span className="text-violet-500">')
    // LinkPreview is left as the bare tag — no baked `data=` attribute injected.
    expect(out).toContain(
      '<LinkPreview href="https://github.com/napi-rs/napi-rs/issues/1794" />',
    )
    expect(out).not.toContain("data='")
    // No island <script> block injected off-route.
    expect(out.startsWith('<script>')).toBe(false)
  })

  it('on-route: the same source is fully rewritten', () => {
    const out = convert(OFF_ROUTE_SRC, 'Heading', WEBASSEMBLY_ROUTE)
    expect(out).not.toContain('getStaticProps')
    expect(out).toContain('<img src="/assets/vite.svg"')
    expect(out).not.toContain('{ViteLogo.src}')
    // JSX-isms converted to valid HTML.
    expect(out).toContain('<a style="color: red" href="https://x.test">')
    expect(out).toContain('<span class="text-violet-500">')
    expect(out).not.toContain('style={{')
    expect(out).not.toContain('className=')
    expect(out).toContain(
      '<LinkPreview href="https://github.com/napi-rs/napi-rs/issues/1794" data=\'',
    )
    expect(out.startsWith('<script>')).toBe(true)
  })

  it('on-route: fenced logo img / LinkPreview / getStaticProps stay literal', () => {
    const src = [
      '# Heading',
      '',
      '```tsx',
      '<img src={ViteLogo.src} width={20} height={20} />',
      '<LinkPreview href="https://github.com/napi-rs/napi-rs/issues/1794" />',
      'export const getStaticProps = () => {}',
      '```',
      '',
    ].join('\n')
    const out = convert(src, 'Heading', WEBASSEMBLY_ROUTE)
    // Untouched inside the fence.
    expect(out).toContain('<img src={ViteLogo.src} width={20} height={20} />')
    expect(out).toContain(
      '<LinkPreview href="https://github.com/napi-rs/napi-rs/issues/1794" />',
    )
    expect(out).toContain('export const getStaticProps = () => {}')
    expect(out).not.toContain('/assets/vite.svg')
    expect(out).not.toContain("data='")
  })
})

describe('converter is side-effect-free to import', () => {
  it('imports cleanly via a bare dynamic import (no argv[1]) and does NOT run the CLI', () => {
    // Regression: the CLI main-guard must guard `process.argv[1]` before calling
    // pathToFileURL — `node -e "import('./...')"` has argv[1] === undefined, where
    // pathToFileURL(undefined) THROWS and crashes the import. The export path
    // (used by these tests) must stay import-safe in any Node context. Also
    // asserts main() did NOT run on import (it would regenerate pages).
    const scriptUrl = pathToFileURL(
      join(root, 'scripts', 'convert-content.mjs'),
    ).href
    const code = `import(${JSON.stringify(scriptUrl)}).then((m) => { if (typeof m.convert !== 'function' || typeof m.GETTING_STARTED_ROUTE !== 'string' || typeof m.WEBASSEMBLY_ROUTE !== 'string') { console.error('missing exports'); process.exit(2) } process.stdout.write('ok') }).catch((e) => { console.error(e); process.exit(3) })`
    // execFileSync throws on a non-zero exit; an undefined-argv crash would exit 3.
    const stdout = execFileSync('node', ['--input-type=module', '-e', code], {
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString()
    expect(stdout).toBe('ok')
  })
})
