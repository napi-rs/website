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
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const legacyDocs = join(root, 'legacy_pages', 'docs')
const pagesDir = join(root, 'pages')

const LOCALES = ['en', 'cn', 'pt-BR']

// Hard exclusions — handled by later island/dynamic tasks. Matched against the
// legacy route path (relative to legacy_pages/docs, no locale/ext), so all three
// locales of each are excluded.
const EXCLUDED_ROUTES = new Set([
  'introduction/getting-started', // imports a .mp4 Video + inline styles
  'concepts/webassembly', // getStaticProps + TransformImage/LinkPreview
])

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
 */
function phaseABlocks(src) {
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
    const line = lines[i]
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
 * Run the full conversion on a source string. Returns the converted markdown.
 */
function convert(src) {
  const records = phaseABlocks(src)

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

  return result
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

function main() {
  // Clean the generated tree so removed source files don't leave stale output.
  // Only ever touch pages/<locale>/docs — never pages/index.md or other pages.
  for (const locale of LOCALES) {
    const dir = join(pagesDir, locale, 'docs')
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  }

  const allFiles = walk(legacyDocs).sort()
  const converted = []
  const skipped = []

  for (const fullPath of allFiles) {
    const parsed = parseLegacy(fullPath)
    if (!parsed) continue // not a <name>.<locale>.<ext> file (e.g. _meta.*.json)
    const { routePath, locale } = parsed
    if (!LOCALES.includes(locale)) continue
    if (EXCLUDED_ROUTES.has(routePath)) continue

    const src = readFileSync(fullPath, 'utf8')
    const output = convert(src)

    const outPath = join(pagesDir, locale, 'docs', `${routePath}.md`)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, output, 'utf8')
    converted.push({ routePath, locale, outPath })
  }

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

main()
