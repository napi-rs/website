// scripts/convert-content.mjs
//
// Deterministic, idempotent converter: legacy Nextra prose docs (.mdx/.md)
// -> @void/md plain-markdown pages under pages/<locale>/docs/...
//
// Re-run: node scripts/convert-content.mjs   (or: oxnode scripts/convert-content.mjs)
//
// Reads ONLY legacy_pages/. Writes ONLY pages/<locale>/docs/. Never mutates source.
//
// Model: scripts/build-nav.mjs (generator that emits committed output + runs vp fmt).
//
// ----------------------------------------------------------------------------
// What @void/md is (verified against node_modules/void/.../markdown.md + a live
// dev-server probe, see task-4a report):
//   - Plain markdown, NOT MDX. UPPERCASE tags (<Callout>, <Green>, <NodeLink>...)
//     are treated as island components -> they MUST be rewritten or the page breaks.
//   - Containers: ::: tip | warning | danger | info | details  (there is NO :::note).
//   - Code-fence meta keeps language + {lines} line-highlight (e.g. ```rust {10}).
//   - filename="X" in fence meta is SILENTLY IGNORED (no render, no error, no 500).
//     -> we strip it from the meta and emit a bold caption line **X** above the fence.
//   - Lowercase raw HTML (<span class="chalk-green">...) passes through fine.
// ----------------------------------------------------------------------------

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const legacyDocs = join(root, 'legacy_pages', 'docs')
const pagesDir = join(root, 'pages')

// LinkPreview metadata fixture, baked from the legacy getStaticProps by
// scripts/fetch-link-previews.mjs. Loaded lazily (and cached) so importing this
// module for tests never touches the filesystem; only the route-gated
// WebAssembly LinkPreview rewrite below actually reads it.
const LINK_PREVIEW_DATA_PATH = join(
  root,
  'lib',
  'docs',
  'link-preview-data.json',
)
let _linkPreviewData
function linkPreviewFixture() {
  if (_linkPreviewData === undefined) {
    if (!existsSync(LINK_PREVIEW_DATA_PATH)) {
      throw new Error(
        `Missing LinkPreview fixture ${relative(root, LINK_PREVIEW_DATA_PATH)} — run \`node scripts/fetch-link-previews.mjs\` first.`,
      )
    }
    _linkPreviewData = JSON.parse(readFileSync(LINK_PREVIEW_DATA_PATH, 'utf8'))
  }
  return _linkPreviewData
}

const LOCALES = ['en', 'cn', 'pt-BR']

// Hard exclusions — handled by later island/dynamic tasks. Matched against the
// legacy route path (relative to legacy_pages/docs, no locale/ext), so all three
// locales of each are excluded. (Currently empty: concepts/webassembly is now
// converted with route-gated island rewrites below.)
const EXCLUDED_ROUTES = new Set([])

// The single legacy route whose prose carries page-specific media (a JSX
// <video> element and a co-located ./package-template.png image). The two media
// rewrites below are gated to this exact route so the converter stays a general
// tool: a <video> or ./package-template.png on any OTHER page passes through
// untouched rather than being silently rewritten to getting-started's assets.
const GETTING_STARTED_ROUTE = 'introduction/getting-started'

// The legacy WebAssembly page carries page-specific JSX that @void/md cannot
// evaluate: a getStaticProps data loader, inline logo <img src={X.src} ...>
// elements, two <LinkPreview href=.../> previews (fed by getStaticProps), and a
// <TransformImage /> interactive demo. The rewrites below (strip getStaticProps,
// static-ify logos, bake LinkPreview metadata from the fixture, fall back the
// demo, inject the LinkPreview island <script>) are ALL gated to this exact
// route so the converter stays a general tool.
const WEBASSEMBLY_ROUTE = 'concepts/webassembly'

// ----------------------------------------------------------------------------
// File discovery
// ----------------------------------------------------------------------------

/** Recursively list files under dir that match .mdx/.md. */
function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else if (name.endsWith('.mdx') || name.endsWith('.md')) {
      out.push(full)
    }
  }
  return out
}

/**
 * Parse a legacy doc filename into { routePath, locale }.
 * legacy_pages/docs/<routePath>.<locale>.{mdx,md}
 * Returns null if the filename does not match the <name>.<locale>.<ext> shape.
 */
function parseLegacy(fullPath) {
  const rel = relative(legacyDocs, fullPath).replace(/\\/g, '/') // e.g. concepts/class.en.mdx
  const m = rel.match(/^(.+)\.(en|cn|pt-BR)\.(mdx|md)$/)
  if (!m) return null
  return { routePath: m[1], locale: m[2] }
}

// ----------------------------------------------------------------------------
// Conversion
// ----------------------------------------------------------------------------

const FENCE_RE = /^\s*(```+|~~~+)/

/** Map a <Callout ...> open tag to its container marker. Default -> info. */
function calloutMarker(openTag) {
  // openTag is the full "<Callout ...>" string.
  const typeMatch = openTag.match(/type\s*=\s*"([^"]*)"/)
  const type = typeMatch ? typeMatch[1] : ''
  switch (type) {
    case 'warning':
      return '::: warning'
    case 'tip':
      return '::: tip'
    case 'error':
      return '::: danger'
    case 'info':
    case '':
    default:
      return '::: info' // @void/md has no :::note; default Callout -> info
  }
}

/**
 * Phase A — block-level, line-based scan.
 * Tracks fenced-code state and frontmatter state so we NEVER touch fence bodies.
 *   - frontmatter: pass through verbatim
 *   - fence body: pass through verbatim
 *   - fence open: strip filename="X", emit **X** caption above, keep lang + {lines}
 *   - <Callout ...> / </Callout>: container markers (handles bare, trailing-content,
 *     and full single-line forms)
 *   - top-level `import ` lines: dropped
 * Returns an array of { text, code } line records. `code` true => inside fence body
 * (or a fence delimiter) and must be skipped by the inline phase.
 *
 * `routePath` is the legacy route (e.g. 'introduction/getting-started'); it gates
 * the page-specific media rewrites so they only fire on GETTING_STARTED_ROUTE.
 */
function phaseABlocks(src, routePath) {
  const isGettingStarted = routePath === GETTING_STARTED_ROUTE
  const isWebAssembly = routePath === WEBASSEMBLY_ROUTE
  const lines = src.split('\n')
  const out = []
  let inFence = false
  let fenceClosed = false // closing fence delimiter is also "code" for inline phase

  // Frontmatter: only when the very first line is exactly `---`.
  let i = 0
  let inFrontmatter = false
  if (lines[0] !== undefined && lines[0].trim() === '---') {
    inFrontmatter = true
    out.push({ text: lines[0], code: true })
    i = 1
    for (; i < lines.length; i++) {
      out.push({ text: lines[i], code: true })
      if (lines[i].trim() === '---') {
        i++
        break
      }
    }
    inFrontmatter = false
  }

  for (; i < lines.length; i++) {
    let line = lines[i]
    fenceClosed = false

    if (FENCE_RE.test(line)) {
      if (!inFence) {
        // Opening fence — rewrite meta (strip filename=, keep lang + {lines}).
        const { fenceLine, caption } = rewriteFenceOpen(line)
        if (caption !== null) {
          out.push({ text: caption, code: false })
          out.push({ text: '', code: false })
        }
        out.push({ text: fenceLine, code: true })
        inFence = true
      } else {
        // Closing fence.
        out.push({ text: line, code: true })
        inFence = false
        fenceClosed = true
      }
      continue
    }

    if (inFence) {
      out.push({ text: line, code: true })
      continue
    }

    // --- outside fences, outside frontmatter ---

    // JSX <video> block (introduction/getting-started ONLY). @void/md is plain
    // markdown, so it passes through lowercase raw HTML verbatim but cannot
    // evaluate a JSX `src={Video}` expression or a `style={{ ... }}` object.
    // The accompanying `import Video from '...mp4'` line is already dropped by
    // the generic top-level `import` stripper below; here we collapse the
    // multi-line JSX <video> element into one self-contained raw-HTML line that
    // points at the statically-served asset (`public/assets/napi-rs-guide.mp4`
    // -> `/assets/napi-rs-guide.mp4`). Route-gated to GETTING_STARTED_ROUTE (the
    // only page with a JSX media element in the prose corpus); a <video> on any
    // other page is left completely untouched rather than rewritten.
    if (isGettingStarted && /^\s*<video\b/.test(line)) {
      // Consume lines until the closing </video> (inclusive). The block is
      // always outside a fence here, so no fence-state juggling is needed.
      let j = i
      let block = lines[j]
      while (!/<\/video>/.test(lines[j]) && j < lines.length - 1) {
        j++
        block += '\n' + lines[j]
      }
      const html = rewriteVideoBlock(block)
      out.push({ text: html, code: false })
      i = j
      continue
    }

    // Rewrite the docs-relative package-template image reference to the
    // statically-served asset path. Legacy ref is `./package-template.png`
    // (co-located in legacy_pages/, which is read-only and NOT served); the
    // asset is committed to `public/assets/package-template.png` so it resolves
    // at `/assets/package-template.png`, matching the same `/assets/...`
    // convention the video uses. Route-gated to GETTING_STARTED_ROUTE and
    // matched on the markdown-image DESTINATION syntax `](./package-template.png)`
    // ONLY — a prose/text mention of `./package-template.png` is left untouched.
    if (isGettingStarted && line.includes('](./package-template.png)')) {
      line = line.replace(
        /\]\(\.\/package-template\.png\)/g,
        '](/assets/package-template.png)',
      )
    }

    // WebAssembly page (route-gated, outside fences). All three rewrites here are
    // idempotent and never fire on any other route.
    if (isWebAssembly) {
      // <TransformImage /> -> static "Interactive demo" fallback container.
      // (The interactive WASM demo island is deferred to a later task.)
      if (/^\s*<TransformImage\s*\/>\s*$/.test(line)) {
        for (const c of TRANSFORM_IMAGE_FALLBACK.split('\n'))
          out.push({ text: c, code: false })
        continue
      }
      // Inline logo <img src={NAME.src} ...> (incl. inside `### ` headings, and
      // multiple per line) -> static /assets/ raw HTML.
      if (/<img\b[^>]*\bsrc\s*=\s*\{[A-Za-z]/.test(line)) {
        line = rewriteWasmLogoImgs(line)
      }
      // Remaining inline JSX-isms in raw HTML (the course-link <a> in the first
      // Callout, and the colored <span>s next to the bundler logos). @void/md
      // emits plain markdown: markdown-it ESCAPES any tag whose attributes use a
      // JSX `style={{ ... }}` object (the whole <a> would leak as visible text),
      // and `className=` is an inert attribute in real HTML (the Tailwind color
      // class never applies). Convert JSX style objects to CSS strings and
      // `className` -> `class`. The logo <img>s are already rewritten above (no
      // `style={{` remains on their line), so this runs AFTER them; it runs
      // BEFORE the LinkPreview rewrite so the baked `data='...'` JSON blob is
      // never scanned for these substrings. Both are idempotent and fence-gated.
      if (line.includes('style={{')) {
        line = line.replace(
          /style=\{\{([^}]*)\}\}/g,
          (_, inner) => `style="${jsxStyleObjectToCss(inner)}"`,
        )
      }
      if (line.includes('className=')) {
        line = line.replace(/\bclassName=/g, 'class=')
      }
      // <LinkPreview href="..." /> -> add the baked `data='...'` metadata prop.
      if (/<LinkPreview\b/.test(line)) {
        line = rewriteLinkPreview(line)
      }
    }

    // Strip MDX comments `{/* ... */}`. In MDX these are invisible when rendered,
    // but @void/md is plain markdown, so a leaked comment renders as visible text
    // (and `vp fmt` even mangles the `*` into emphasis -> `{/_ ..._/}`). We only do
    // this OUTSIDE code fences (handled by the fence checks above), so `/* */` that
    // is legitimate code inside a ``` block is never touched.
    //   - whole-line `{/* ... */}`            -> drop the line
    //   - multi-line `{/*` ... later `*/}`    -> drop every line in the span
    //   - inline mid-line `{/* ... */}`       -> strip just the comment substring
    // Only engage when this line actually opens an MDX comment; otherwise leave
    // the line (including ordinary blank lines) completely untouched.
    if (line.includes('{/*')) {
      // Remove any complete `{/* ... */}` occurrences on this single line.
      let stripped = line.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      // If an opening `{/*` remains with no matching close on this line, it is a
      // multi-line comment: consume following lines until the closing `*/}`.
      const openIdx = stripped.indexOf('{/*')
      if (openIdx !== -1) {
        let before = stripped.slice(0, openIdx)
        let j = i + 1
        let closed = false
        for (; j < lines.length; j++) {
          const closeIdx = lines[j].indexOf('*/}')
          if (closeIdx !== -1) {
            before += lines[j].slice(closeIdx + 3)
            closed = true
            break
          }
        }
        // Advance the outer loop past the consumed lines (the for-loop's i++ then
        // lands on the line after the close, or after the file if unterminated).
        i = closed ? j : lines.length
        stripped = before
      }
      // If only whitespace survives (the common whole-line comment case), drop the
      // line entirely; the surrounding blank lines are preserved by the normal flow
      // and `convert()`/`vp fmt` normalize blank runs afterward. Otherwise keep the
      // surviving inline-stripped text and fall through to the handling below.
      if (stripped.trim() === '') {
        continue
      }
      line = stripped
    }

    // Drop top-level MDX import lines (Callout / chalk / NodeLink / etc.).
    if (/^import\s/.test(line)) {
      continue
    }

    // Callout open/close handling. Tags may be bare on their own line, carry
    // trailing content, or be a complete single-line <Callout ...>...</Callout>.
    const converted = convertCalloutLine(line)
    if (converted !== null) {
      for (const c of converted) out.push({ text: c, code: false })
      continue
    }

    out.push({ text: line, code: false })
  }

  // Guard against the artificial blank that a trailing caption never needs.
  void fenceClosed
  void inFrontmatter
  return out
}

/**
 * Rewrite an opening fence line:
 *   ```rust {10} filename="lib.rs"  ->  fence="```rust {10}", caption="**lib.rs**"
 *   ```ts filename="index.d.ts"     ->  fence="```ts",        caption="**index.d.ts**"
 *   ```rust {10}                    ->  fence unchanged, caption=null
 * Returns { fenceLine, caption } (caption is null when no filename= present).
 */
function rewriteFenceOpen(line) {
  const fnMatch = line.match(/\s*filename\s*=\s*"([^"]*)"/)
  if (!fnMatch) return { fenceLine: line, caption: null }
  const filename = fnMatch[1]
  // Remove the filename="..." token (and the single space that precedes it).
  let fenceLine = line.replace(/\s*filename\s*=\s*"[^"]*"/, '')
  // Collapse any double space left behind and trim trailing space.
  fenceLine = fenceLine.replace(/[ \t]+$/, '')
  return { fenceLine, caption: `**${filename}**` }
}

/**
 * Convert a JSX `style={{ key: 'val', ... }}` object literal to a CSS string,
 * e.g. `{{ width: '100%' }}` -> `width: 100%`. Keeps declaration order, lowers
 * camelCase keys to kebab-case (none in this corpus, but correct in general),
 * and strips the quotes around values. Pure + deterministic.
 */
function jsxStyleObjectToCss(objLiteral) {
  // objLiteral is the inner text of the double braces, e.g. ` width: '100%' `.
  const decls = []
  const re = /([A-Za-z][A-Za-z0-9]*)\s*:\s*(?:'([^']*)'|"([^"]*)"|([^,]+))/g
  let m
  while ((m = re.exec(objLiteral)) !== null) {
    const key = m[1].replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
    const value = (m[2] ?? m[3] ?? m[4] ?? '').trim()
    decls.push(`${key}: ${value}`)
  }
  return decls.join('; ')
}

// ----------------------------------------------------------------------------
// WebAssembly-page-specific rewrites (route-gated to WEBASSEMBLY_ROUTE).
// ----------------------------------------------------------------------------

/**
 * Remove the top-level `export const getStaticProps = ...` block from the raw
 * source via brace-balancing. Locates the `export const getStaticProps` marker
 * line OUTSIDE any code fence (so a `getStaticProps` inside a ``` block is left
 * literal), then scans from its first `{` counting `{`/`}` to balance and removes
 * through the closing `}` plus one trailing newline. In the real page the block
 * sits before the first heading/fence; the fence-awareness keeps the transform a
 * correct general tool. No-op (idempotent) when the marker is absent or outside a
 * fence cannot be found. Pure + deterministic.
 */
function stripGetStaticProps(src) {
  const marker = 'export const getStaticProps'
  // Find the marker's byte offset, but only on a line that is OUTSIDE a fence.
  const lines = src.split('\n')
  let inFence = false
  let offset = 0
  let start = -1
  for (const line of lines) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence
    } else if (!inFence) {
      const idx = line.indexOf(marker)
      if (idx !== -1) {
        start = offset + idx
        break
      }
    }
    offset += line.length + 1 // +1 for the '\n' removed by split
  }
  if (start === -1) return src
  // Find the first `{` at/after the marker, then brace-balance to its close.
  const firstBrace = src.indexOf('{', start)
  if (firstBrace === -1) return src
  let depth = 0
  let end = -1
  for (let i = firstBrace; i < src.length; i++) {
    const ch = src[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) return src // unbalanced — leave untouched
  // Consume one trailing newline after the closing brace (and any spaces).
  let after = end + 1
  while (after < src.length && (src[after] === ' ' || src[after] === '\t'))
    after++
  if (src[after] === '\n') after++
  return src.slice(0, start) + src.slice(after)
}

// Logo import-identifier -> served asset filename (all under public/assets/).
const WASM_LOGO_ASSETS = {
  ViteLogo: 'vite.svg',
  WebpackLogo: 'webpack.svg',
  YarnLogo: 'yarn.svg',
  PnpmLogo: 'pnpm.svg',
  NpmLogo: 'npm.png',
}

/**
 * Rewrite every inline JSX logo `<img src={NAME.src} style={{...}} width={N}
 * height={N} />` on a line to static raw HTML pointing at the served asset:
 *   <img src="/assets/FILE" width="N" height="N" style="<css>" /> (className dropped)
 * Handles multiple imgs on one line and imgs embedded in heading lines. The
 * `src={NAME.src}` expression maps via WASM_LOGO_ASSETS; the JSX style object is
 * converted to a CSS string with the existing jsxStyleObjectToCss. Pure +
 * deterministic; lines without a matching logo img pass through unchanged.
 */
function rewriteWasmLogoImgs(line) {
  // Match a self-closing <img ... /> whose src is `{NAME.src}` for a known logo.
  // Attributes are order-tolerant: capture style/width/height wherever they sit.
  const imgRe = /<img\b([^>]*?)\/>/g
  return line.replace(imgRe, (whole, attrs) => {
    const srcMatch = attrs.match(
      /\bsrc\s*=\s*\{\s*([A-Za-z][A-Za-z0-9]*)\.src\s*\}/,
    )
    if (!srcMatch) return whole // not a logo img — leave untouched
    const file = WASM_LOGO_ASSETS[srcMatch[1]]
    if (!file) return whole // unknown identifier — leave untouched
    const styleMatch = attrs.match(/\bstyle\s*=\s*\{\{([\s\S]*?)\}\}/)
    const css = styleMatch ? jsxStyleObjectToCss(styleMatch[1]) : ''
    const widthMatch = attrs.match(/\bwidth\s*=\s*\{?\s*(\d+)\s*\}?/)
    const heightMatch = attrs.match(/\bheight\s*=\s*\{?\s*(\d+)\s*\}?/)
    const parts = [`<img src="/assets/${file}"`]
    if (widthMatch) parts.push(`width="${widthMatch[1]}"`)
    if (heightMatch) parts.push(`height="${heightMatch[1]}"`)
    if (css) parts.push(`style="${css}"`)
    return parts.join(' ') + ' />'
  })
}

/**
 * Encode the fixture metadata for a single-quoted HTML `data` attribute. Only
 * apostrophes are escaped (to `'`) — that is the one character that could
 * terminate the single-quoted attribute early; base64's `/ + =` and JSON's `"`
 * are all safe inside single quotes. The `'` sequence round-trips back to
 * `'` through JSON.parse at runtime. Pure + deterministic.
 */
function encodeLinkPreviewData(entry) {
  return JSON.stringify(entry).replace(/'/g, '\\u0027')
}

// Matches a bare `<LinkPreview href="..." />` tag (no data attribute yet).
// Shared by rewriteLinkPreview() and main()'s preflight so both see exactly the
// same set of hrefs.
const LINK_PREVIEW_TAG_RE = /<LinkPreview\s+href\s*=\s*"([^"]*)"\s*\/>/g

/**
 * Validate that a fixture entry for `href` has the exact shape the island
 * component (components/link-preview.tsx) reads: `json.{title,body,user.login,
 * repoUrl}` plus `og` and `userAvatar`, all non-empty strings. Throws a clear,
 * actionable error otherwise. Used BOTH per-tag in rewriteLinkPreview() and in
 * main()'s preflight (before any destructive cleanup), so a missing OR malformed
 * entry fails fast — it never half-deletes the emitted tree, and a syntactically
 * valid but incomplete fixture (e.g. `{}`) can never serialize a broken island.
 */
function assertLinkPreviewEntry(href, entry) {
  // Plain object = own (not inherited) value that is a non-null, non-array
  // object. JSON.parse only ever yields own enumerable properties, so this also
  // rejects any inherited-field/array shapes a hand-crafted object might carry.
  const ownObj = (o, k) =>
    o != null &&
    Object.hasOwn(o, k) &&
    typeof o[k] === 'object' &&
    o[k] !== null &&
    !Array.isArray(o[k])
  // Non-empty = own string property with at least one non-whitespace char (a
  // whitespace-only "title"/"og" would render a blank card or an invalid image
  // data URL, so it is just as unusable as an empty string).
  const ownStr = (o, k) =>
    o != null &&
    Object.hasOwn(o, k) &&
    typeof o[k] === 'string' &&
    o[k].trim().length > 0
  const ok =
    entry != null &&
    typeof entry === 'object' &&
    !Array.isArray(entry) &&
    ownObj(entry, 'json') &&
    ownStr(entry.json, 'title') &&
    ownStr(entry.json, 'body') &&
    ownObj(entry.json, 'user') &&
    ownStr(entry.json.user, 'login') &&
    ownStr(entry.json, 'repoUrl') &&
    ownStr(entry, 'og') &&
    ownStr(entry, 'userAvatar')
  if (!ok) {
    throw new Error(
      `LinkPreview fixture entry for href ${JSON.stringify(href)} is missing or malformed ` +
        '(need json.{title,body,user.login,repoUrl} + og + userAvatar as non-empty strings) — ' +
        're-run `node scripts/fetch-link-previews.mjs`.',
    )
  }
  return entry
}

/**
 * Validate every LinkPreview href referenced by `src` against the fixture, with
 * the full required shape. Pure (no writes); throws on the first bad entry. Used
 * by main()'s preflight to fail BEFORE the destructive clean.
 */
function assertLinkPreviewFixtureFor(src) {
  const fixture = linkPreviewFixture()
  for (const m of src.matchAll(LINK_PREVIEW_TAG_RE)) {
    assertLinkPreviewEntry(m[1], fixture[m[1]])
  }
}

/**
 * Rewrite `<LinkPreview href="HREF" />` to `<LinkPreview href="HREF" data='ENC' />`
 * where ENC is the fixture metadata for HREF, single-quote-encoded. Throws a
 * clear error if the fixture has no entry for HREF or the entry is malformed
 * (assertLinkPreviewEntry). Idempotent: a tag that already carries a `data=`
 * attribute is left unchanged. Pure given the fixture.
 */
function rewriteLinkPreview(line) {
  return line.replace(LINK_PREVIEW_TAG_RE, (_m, href) => {
    const entry = assertLinkPreviewEntry(href, linkPreviewFixture()[href])
    return `<LinkPreview href="${href}" data='${encodeLinkPreviewData(entry)}' />`
  })
}

// Static fallback for the legacy <TransformImage /> interactive WASM demo. The
// demo is deferred (not yet ported as an island); this markdown container keeps
// the page coherent and points readers at the headers section they need.
const TRANSFORM_IMAGE_FALLBACK = [
  '::: info Interactive demo',
  '',
  'The in-browser image transformer (powered by [`@napi-rs/image`](https://github.com/Brooooooklyn/Image) compiled to WebAssembly) runs on cross-origin-isolated pages — see [Server configuration](#server-configuration) below for the required `SharedArrayBuffer` response headers.',
  '',
  ':::',
].join('\n')

/**
 * Rewrite a JSX <video>...</video> block into a single line of plain raw HTML
 * that @void/md emits verbatim. Called ONLY for GETTING_STARTED_ROUTE (the call
 * site in phaseABlocks is route-gated), which is why hardcoding the served
 * `/assets/napi-rs-guide.mp4` src is correct here — that is the one and only
 * page in the corpus carrying this JSX <video> element:
 *
 *   <video controls style={{ width: '100%' }}>
 *     <source src={Video} type="video/mp4" />
 *     <track kind="captions" srcLang="en" />
 *   </video>
 *     ->
 *   <video controls style="width: 100%"><source src="/assets/napi-rs-guide.mp4" type="video/mp4" /></video>
 *
 * The JSX `style` object becomes a CSS string; the `src={Video}` expression is
 * resolved to the static asset path (the dropped `import Video from
 * '../../../public/assets/napi-rs-guide.mp4'` maps `public/assets/...` ->
 * `/assets/...`). The captions `<track>` (no real caption file) is dropped, to
 * match the agreed target markup. Locale-agnostic: the block is identical in
 * en/cn/pt-BR. Pure + deterministic.
 */
function rewriteVideoBlock(block) {
  // Preserve `controls` and convert the JSX style object to a CSS string.
  const styleMatch = block.match(/style\s*=\s*\{\{([\s\S]*?)\}\}/)
  const css = styleMatch ? jsxStyleObjectToCss(styleMatch[1]) : ''
  // Resolve <source src={Video} ...> to the statically-served asset path.
  // `Video` is the dropped `import ... .mp4` under public/assets, served at
  // /assets/. type comes straight from the source attribute.
  const typeMatch = block.match(/<source\b[^>]*\btype\s*=\s*"([^"]*)"/)
  const type = typeMatch ? typeMatch[1] : 'video/mp4'
  const styleAttr = css ? ` style="${css}"` : ''
  return `<video controls${styleAttr}><source src="/assets/napi-rs-guide.mp4" type="${type}" /></video>`
}

/**
 * Convert a line containing Callout open and/or close tags into container marker
 * lines. Returns an array of output lines, or null if the line has no Callout tag.
 *
 * Handles:
 *   <Callout type="warning" emoji="⚠️">              -> ["::: warning"]
 *   </Callout>                                        -> [":::"]
 *   <Callout>All fields optional.</Callout>           -> ["::: info", "All fields optional.", ":::"]
 *   <Callout type="info">Requires X.</Callout>        -> ["::: info", "Requires X.", ":::"]
 *   text after a closing tag (rare) is preserved on its own line.
 */
function convertCalloutLine(line) {
  const hasOpen = /<Callout\b[^>]*>/.test(line)
  const hasClose = /<\/Callout>/.test(line)
  if (!hasOpen && !hasClose) return null

  // Full single-line form: <Callout ...>inner</Callout>
  const full = line.match(/^(\s*)<Callout\b([^>]*)>([\s\S]*?)<\/Callout>\s*$/)
  if (full) {
    const marker = calloutMarker(`<Callout${full[2]}>`)
    const inner = full[3].trim()
    const result = [marker]
    if (inner) result.push(inner)
    result.push(':::')
    return result
  }

  // Open tag on its own line (optionally with leading whitespace / trailing junk).
  if (hasOpen && !hasClose) {
    const openMatch = line.match(/^(\s*)<Callout\b([^>]*)>(.*)$/)
    if (openMatch) {
      const marker = calloutMarker(`<Callout${openMatch[2]}>`)
      const trailing = openMatch[3].trim()
      const result = [marker]
      if (trailing) result.push(trailing)
      return result
    }
  }

  // Close tag on its own line (optionally with trailing content).
  if (hasClose && !hasOpen) {
    const closeMatch = line.match(/^(.*?)<\/Callout>(.*)$/)
    const before = closeMatch[1].trim()
    const after = closeMatch[2].trim()
    const result = []
    if (before) result.push(before)
    result.push(':::')
    if (after) result.push(after)
    return result
  }

  // Mixed/unexpected (open and close but not the clean full form) — be safe:
  // strip the tags, leaving content, and wrap. Should not occur in this corpus.
  return null
}

/**
 * Phase B — inline component rewrites. Applied ONLY to non-code regions.
 * Operates on a multi-line block of text so it can collapse multi-line
 * <NodeLink> spans. Tags rewritten: NodeLink, Green, Rust, Warning, plus the
 * JSX whitespace trick {' '}.
 */
function phaseBInline(text) {
  let t = text

  // <NodeLink href="URL">TEXT</NodeLink> -> [TEXT](URL)
  // `s` flag so multi-line spans (open tag, content, close on separate lines)
  // collapse. TEXT may contain markdown/backticks; we keep it but trim outer
  // whitespace/newlines introduced by the multi-line layout.
  t = t.replace(
    /<NodeLink\s+href\s*=\s*"([^"]*)"\s*>([\s\S]*?)<\/NodeLink>/g,
    (_m, href, inner) => `[${inner.trim().replace(/\s+/g, ' ')}](${href})`,
  )

  // Chalk inline spans -> lowercase raw HTML spans (CSS added in a later task).
  t = t.replace(
    /<Green>([\s\S]*?)<\/Green>/g,
    (_m, inner) => `<span class="chalk-green">${inner}</span>`,
  )
  t = t.replace(
    /<Rust>([\s\S]*?)<\/Rust>/g,
    (_m, inner) => `<span class="chalk-rust">${inner}</span>`,
  )
  t = t.replace(
    /<Warning>([\s\S]*?)<\/Warning>/g,
    (_m, inner) => `<span class="chalk-warning">${inner}</span>`,
  )

  // JSX whitespace trick: {' '} or {" "} -> a single space.
  t = t.replace(/\{'\s*'\}|\{"\s*"\}/g, ' ')

  return t
}

/**
 * Strip inline markdown/HTML from a heading text so it can be used as a plain
 * `title:` value. Handles the forms that actually appear in the corpus:
 *   - inline code:      `Reference` / `WeakReference`  -> Reference / WeakReference
 *   - links:            [text](url)                    -> text
 *   - bold / italic:    **x** / *x* / _x_              -> x
 *   - leading anchors / trailing `{#id}` heading ids   -> removed
 * The result is whitespace-collapsed and trimmed. Pure + deterministic.
 */
function stripMarkdownInline(text) {
  let t = text
  // Trailing explicit heading id `{#slug}`.
  t = t.replace(/\s*\{#[^}]*\}\s*$/, '')
  // Links [label](url) -> label.
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  // Inline code `x` -> x.
  t = t.replace(/`([^`]*)`/g, '$1')
  // Bold/italic markers (**, __, *, _) -> removed (keep inner text).
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1')
  t = t.replace(/__([^_]+)__/g, '$1')
  t = t.replace(/\*([^*]+)\*/g, '$1')
  t = t.replace(/_([^_]+)_/g, '$1')
  // Collapse whitespace.
  t = t.replace(/\s+/g, ' ').trim()
  return t
}

/**
 * Encode a derived title as a single-quoted YAML scalar, matching the existing
 * frontmatter style (`title: 'A simple package'`). Single quotes inside the
 * value are escaped by doubling, per YAML. Pure + deterministic.
 */
function yamlSingleQuote(value) {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * Ensure the converted markdown carries a frontmatter `title:`.
 *
 * @void/md derives `<title>` from frontmatter `title`; with void.json's
 * `titleTemplate: "%s – NAPI-RS"` a page WITHOUT a title renders an empty
 * `<title>` (no `%s` substitution). Deterministic fix: when the frontmatter has
 * no `title`, derive one from the page's first H1 (`# ...`) with inline markdown
 * stripped, and inject it.
 *
 *   - frontmatter present, no title  -> insert `title: '<derived>'` first key
 *   - no frontmatter block at all     -> create `---\ntitle: '<derived>'\n---`
 *   - frontmatter already has a title -> unchanged
 *
 * Title source, in order: first ATX H1 (`# ...`), then `fallbackTitle` (the
 * legacy `_meta.<locale>.json` leaf title — a handful of pages start at H2 with
 * no H1, e.g. concepts/env, more/v2-v3-migration-guide), then the first heading
 * of any level. Every in-scope page resolves to a non-empty title this way; the
 * content.test asserts it can never silently go empty.
 *
 * Idempotent: a second run sees the injected title and is a no-op.
 */
function ensureFrontmatterTitle(md, fallbackTitle) {
  const lines = md.split('\n')

  // Detect a leading frontmatter block (first line exactly `---`).
  let hasFm = false
  let fmEnd = -1 // index of the closing `---`
  if (lines[0] !== undefined && lines[0].trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        hasFm = true
        fmEnd = i
        break
      }
    }
  }

  // Already has a title key inside the frontmatter? Leave it alone.
  if (hasFm) {
    for (let i = 1; i < fmEnd; i++) {
      if (/^title\s*:/.test(lines[i])) return md
    }
  }

  // Scan the body for headings: prefer the first H1, but remember the first
  // heading of any level as a last resort.
  const bodyStart = hasFm ? fmEnd + 1 : 0
  let h1 = null
  let firstHeading = null
  let inFence = false
  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i]
    if (FENCE_RE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (!m) continue
    const text = stripMarkdownInline(m[2])
    if (!text) continue
    if (firstHeading === null) firstHeading = text
    if (m[1].length === 1) {
      h1 = text
      break
    }
  }

  const derived =
    h1 ??
    (fallbackTitle ? stripMarkdownInline(fallbackTitle) : null) ??
    firstHeading
  if (!derived) return md // nothing to derive from — leave unchanged

  const titleLine = `title: ${yamlSingleQuote(derived)}`

  if (hasFm) {
    // Insert title as the FIRST frontmatter key (right after the opening `---`).
    lines.splice(1, 0, titleLine)
    return lines.join('\n')
  }
  // No frontmatter: prepend a fresh block.
  return `---\n${titleLine}\n---\n\n${md}`
}

// The @void/md island <script> block for the WebAssembly page. NOTE: @void/md's
// extractScript() anchors its SCRIPT_RE at the START of the file (`/^<script.../`,
// no `m` flag — verified against node_modules/@void/md/dist/plugin.mjs:398), so
// the block MUST precede the frontmatter or the island is never extracted and the
// raw `<script>` leaks as visible text. We inject it at byte 0 accordingly; the
// trailing frontmatter survives because extractScript() slices the script off and
// hands the remaining `---\ntitle...\n---\n...` body to gray-matter.
const WEBASSEMBLY_SCRIPT_BLOCK = [
  '<script>',
  'import LinkPreview from "../../../../components/link-preview.tsx" with { island: "visible" }',
  '</script>',
].join('\n')

/**
 * Run the full conversion on a source string. Returns the converted markdown.
 * `fallbackTitle` (the legacy `_meta` leaf title) is used only when the page has
 * no H1 to derive a frontmatter `title` from. `routePath` (the legacy route)
 * gates the page-specific media rewrites to GETTING_STARTED_ROUTE and the island
 * rewrites to WEBASSEMBLY_ROUTE.
 */
function convert(src, fallbackTitle, routePath) {
  // Self-idempotency: a legacy .mdx source never begins with an island
  // `<script>` block, so a leading one means `src` is already-converted output
  // being fed back through convert() (e.g. a stricter `convert(convert(x))`
  // check, or a future caller that re-reads emitted pages). Strip it here; the
  // byte-0 injection at the end re-adds the canonical block, so
  // convert(convert(x)) === convert(x). Uses the same start-anchored pattern as
  // @void/md's extractScript (node_modules/@void/md/dist/plugin.mjs:398).
  src = src.replace(/^<script\b[^>]*>[\s\S]*?<\/script>\s*\n?/, '')

  // WebAssembly pre-pass: strip the top-level getStaticProps data loader before
  // the line-based scan (it spans many lines with nested braces and sits before
  // the first heading/fence). Route-gated + idempotent.
  if (routePath === WEBASSEMBLY_ROUTE) {
    src = stripGetStaticProps(src)
  }

  const records = phaseABlocks(src, routePath)

  // Reassemble, applying the inline phase to contiguous non-code regions only.
  const pieces = []
  let buffer = []
  const flush = () => {
    if (buffer.length) {
      pieces.push(phaseBInline(buffer.join('\n')))
      buffer = []
    }
  }
  for (const rec of records) {
    if (rec.code) {
      flush()
      pieces.push(rec.text)
    } else {
      buffer.push(rec.text)
    }
  }
  flush()

  let result = pieces.join('\n')

  // Normalize: collapse 3+ consecutive blank lines to at most 2, ensure exactly
  // one trailing newline. Keeps re-runs byte-identical and avoids drift from the
  // caption-insertion / tag-removal steps. (vp fmt also normalizes, but doing it
  // here keeps the script self-consistent before formatting.)
  result = result.replace(/\n{3,}/g, '\n\n')
  result = result.replace(/\s+$/, '') + '\n'
  // Strip leading blank lines.
  result = result.replace(/^\n+/, '')

  // Inject a frontmatter `title:` derived from the first H1 (or the legacy
  // _meta title for the handful of H1-less pages) when absent, so every page
  // renders a non-empty <title> under titleTemplate. Runs LAST so it sees the
  // fully-normalized output (and stays idempotent on re-run).
  result = ensureFrontmatterTitle(result, fallbackTitle)

  // WebAssembly: prepend the LinkPreview island <script> block at byte 0 (see
  // WEBASSEMBLY_SCRIPT_BLOCK — it MUST precede the frontmatter). Idempotent: a
  // re-run sees the block already present and skips it.
  if (routePath === WEBASSEMBLY_ROUTE && !result.startsWith('<script>')) {
    result = `${WEBASSEMBLY_SCRIPT_BLOCK}\n\n${result}`
  }

  return result
}

// ----------------------------------------------------------------------------
// Legacy _meta title lookup (fallback title source for H1-less pages)
// ----------------------------------------------------------------------------

/**
 * Resolve the human title for a legacy route leaf from its directory's
 * `_meta.<locale>.json`, e.g. routePath `more/v2-v3-migration-guide`, locale
 * `en` -> legacy_pages/docs/more/_meta.en.json["v2-v3-migration-guide"].
 * Returns null when no meta entry exists. Cached per (dir, locale).
 */
const metaCache = new Map()
function legacyMetaTitle(routePath, locale) {
  const slashIdx = routePath.lastIndexOf('/')
  const dirRel = slashIdx === -1 ? '' : routePath.slice(0, slashIdx)
  const leaf = slashIdx === -1 ? routePath : routePath.slice(slashIdx + 1)
  const metaPath = join(legacyDocs, dirRel, `_meta.${locale}.json`)
  const cacheKey = metaPath
  let meta = metaCache.get(cacheKey)
  if (meta === undefined) {
    meta = existsSync(metaPath)
      ? JSON.parse(readFileSync(metaPath, 'utf8'))
      : null
    metaCache.set(cacheKey, meta)
  }
  const value = meta?.[leaf]
  return typeof value === 'string' ? value : null
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

/**
 * Recursively delete ONLY `.md` files under `dir` (the converter's own output),
 * leaving every other file untouched. Critically, the per-locale docs layout
 * entries `pages/<locale>/docs/layout.island.tsx` are hand-authored and live in
 * this same tree — a blanket `rmSync(dir, { recursive: true })` would destroy
 * them on every run. We prune emitted markdown surgically instead, then remove
 * directories only when they are left empty.
 */
function cleanEmittedMarkdown(dir) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      cleanEmittedMarkdown(full)
      // Remove the directory only if our pruning left it empty (preserves dirs
      // that still hold non-.md files such as a layout entry).
      if (readdirSync(full).length === 0) rmSync(full, { recursive: true })
    } else if (name.endsWith('.md')) {
      rmSync(full)
    }
  }
}

function main() {
  const allFiles = walk(legacyDocs).sort()

  // Preflight required generated inputs BEFORE any destructive cleanup, so a
  // missing/corrupt/incomplete fixture fails fast instead of wiping the emitted
  // docs tree and aborting mid-conversion (leaving a partially-empty tree) — or
  // worse, serializing a broken island. The only such input today is the
  // LinkPreview fixture, needed by the in-scope WebAssembly source(s). Validate
  // EVERY href those sources reference, with the full required entry shape (not
  // just that the JSON file exists and parses), up front.
  for (const f of allFiles) {
    const p = parseLegacy(f)
    if (
      !p ||
      p.routePath !== WEBASSEMBLY_ROUTE ||
      !LOCALES.includes(p.locale)
    ) {
      continue
    }
    if (EXCLUDED_ROUTES.has(p.routePath)) continue
    assertLinkPreviewFixtureFor(readFileSync(f, 'utf8'))
  }

  // Clean stale emitted markdown so removed source files don't leave orphans.
  // Only ever delete `.md` files under pages/<locale>/docs — never the layout
  // islands living in the same tree, nor pages/index.md or other pages.
  for (const locale of LOCALES) {
    cleanEmittedMarkdown(join(pagesDir, locale, 'docs'))
  }

  const converted = []
  const skipped = []

  for (const fullPath of allFiles) {
    const parsed = parseLegacy(fullPath)
    if (!parsed) continue // not a <name>.<locale>.<ext> file (e.g. _meta.*.json)
    const { routePath, locale } = parsed
    if (!LOCALES.includes(locale)) continue
    if (EXCLUDED_ROUTES.has(routePath)) continue

    const src = readFileSync(fullPath, 'utf8')
    const output = convert(src, legacyMetaTitle(routePath, locale), routePath)

    const outPath = join(pagesDir, locale, 'docs', `${routePath}.md`)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, output, 'utf8')
    converted.push({ routePath, locale, outPath, output })
  }

  // Island pages lead with a `<script>` block (it MUST precede the frontmatter so
  // @void/md's start-anchored extractScript picks it up). `vp fmt` then no longer
  // recognizes the trailing `---` as frontmatter and reflows it into a thematic
  // break — so we exempt those pages from formatting and restore the converter's
  // own already-normalized output verbatim after `vp fmt` runs over the tree.
  const islandPages = converted.filter((c) => c.output.startsWith('<script>'))

  // Format the emitted tree so committed output matches `vp fmt` and re-runs are
  // stable. Verified that vp fmt does not reflow containers / fences / captions.
  try {
    const targets = LOCALES.map((l) => join(pagesDir, l, 'docs')).filter(
      existsSync,
    )
    if (targets.length) {
      execSync(`vp fmt ${targets.map((t) => `"${t}"`).join(' ')} --write`, {
        cwd: root,
        stdio: 'pipe',
      })
    }
  } catch {
    // vp not on PATH; pre-commit hook will format.
  }

  // Restore island pages to their pre-fmt bytes (see above).
  for (const page of islandPages) {
    writeFileSync(page.outPath, page.output, 'utf8')
  }

  // Report
  const perSection = {}
  for (const c of converted) {
    const section = c.routePath.includes('/')
      ? c.routePath.split('/')[0]
      : '(root)'
    const key = `${section}/${c.locale}`
    perSection[key] = (perSection[key] || 0) + 1
  }
  console.log(`Converted ${converted.length} files.`)
  for (const key of Object.keys(perSection).sort()) {
    console.log(`  ${key}: ${perSection[key]}`)
  }
  if (skipped.length) {
    console.log(`Skipped ${skipped.length}:`)
    for (const s of skipped) console.log(`  ${s}`)
  }
}

// Run as a CLI when invoked directly (node/oxnode scripts/convert-content.mjs),
// but stay side-effect-free when imported. `process.argv[1]` is undefined in
// bare dynamic-import contexts (`node -e "import('./...')"`), where
// `pathToFileURL(undefined)` would THROW and crash the import — so guard it.
const cliEntry = process.argv[1]
if (cliEntry && import.meta.url === pathToFileURL(cliEntry).href) {
  main()
}

export {
  convert,
  GETTING_STARTED_ROUTE,
  WEBASSEMBLY_ROUTE,
  assertLinkPreviewEntry,
}
