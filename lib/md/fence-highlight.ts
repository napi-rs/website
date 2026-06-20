// Convert Nextra-style code-fence highlight meta (```lang {3,5-7}) into Shiki
// "notation" comments (// [!code highlight]) at build time.
//
// Why: @void/md loads `markdown-it-attrs` AFTER its fence renderer, and attrs
// consumes the trailing `{…}` curly block before Shiki's `transformerMetaHighlight`
// can read it from `meta.__raw` — so the `{n}` line-highlight meta our docs
// inherited from Nextra silently does nothing. Shiki's `transformerNotationHighlight`
// (also enabled by @void/md) reads inline `[!code highlight]` comments instead,
// which attrs leaves alone. We rewrite one form into the other in a Vite `pre`
// transform so the source .md keeps the readable `{n}` form and the rendered
// output gains the highlight (the notation comment is stripped by Shiki).
//
// Languages whose grammar has no line-comment token (e.g. `text`) are left
// untouched — a notation comment there would render literally. Those fences keep
// their (inert) `{n}` meta, matching today's behaviour.

// Single-line comment leader per language. Anything not listed is skipped.
const LINE_COMMENT: Record<string, string> = {
  rust: '//',
  js: '//',
  jsx: '//',
  ts: '//',
  tsx: '//',
  json: '//',
  json5: '//',
  jsonc: '//',
  bash: '#',
  sh: '#',
  shell: '#',
  zsh: '#',
  toml: '#',
  yaml: '#',
  yml: '#',
  python: '#',
  py: '#',
}

// "{3,5-7,12}" -> Set {3,5,6,7,12} (1-based line numbers within the block).
function parseSpec(spec: string): Set<number> {
  const out = new Set<number>()
  for (const part of spec.split(',')) {
    const range = part.match(/^(\d+)-(\d+)$/)
    if (range) {
      const lo = Number(range[1])
      const hi = Number(range[2])
      for (let n = lo; n <= hi; n++) out.add(n)
    } else if (/^\d+$/.test(part)) {
      out.add(Number(part))
    }
  }
  return out
}

// Matches a fence opener carrying ONLY a `{spec}` meta, e.g. "```rust {4}" or
// "  ~~~ts {1,3-5}". Captures indent, fence run, language, and the spec.
const OPENER =
  /^([ \t]*)(`{3,}|~{3,})([A-Za-z0-9_+-]+)[ \t]*\{([0-9,\-]+)\}[ \t]*$/

/**
 * Rewrite `{n}` fence highlight meta to Shiki notation comments. Pure string in,
 * string out — safe to run on every .md compile. Returns the input unchanged
 * when there is nothing to convert.
 */
export function convertFenceHighlightMeta(src: string): string {
  if (!src.includes('{')) return src
  const lines = src.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const m = lines[i].match(OPENER)
    if (!m) {
      out.push(lines[i])
      i++
      continue
    }
    const [, indent, fence, lang, spec] = m
    const comment = LINE_COMMENT[lang.toLowerCase()]
    if (!comment) {
      // No comment syntax (e.g. `text`) — leave the fence as-is.
      out.push(lines[i])
      i++
      continue
    }
    const targets = parseSpec(spec)
    // Re-emit the opener without the `{spec}` so attrs has nothing to eat.
    out.push(`${indent}${fence}${lang}`)
    i++
    // The closing fence is >= the opener's run of the same char.
    const closeRe = new RegExp(`^[ \\t]*${fence[0]}{${fence.length},}[ \\t]*$`)
    let n = 0
    while (i < lines.length && !closeRe.test(lines[i])) {
      n++
      let codeLine = lines[i]
      if (targets.has(n) && !codeLine.includes('[!code')) {
        codeLine = `${codeLine.replace(/[ \t]+$/, '')} ${comment} [!code highlight]`
      }
      out.push(codeLine)
      i++
    }
    if (i < lines.length) {
      out.push(lines[i]) // closing fence
      i++
    }
  }
  return out.join('\n')
}
