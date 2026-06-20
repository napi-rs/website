// Render a code block's filename as an attached header bar, matching napi.rs.
//
// Nextra showed code-fence `filename="lib.rs"` meta as a header bar at the top of
// the block. scripts/convert-content.mjs turned that meta into a bold caption
// paragraph above the fence (`**lib.rs**`), which @void/md renders as plain
// `<p><strong>lib.rs</strong></p>` — not napi.rs's header bar. We can't tell a
// filename caption from an author's bold-only paragraph by CSS alone (e.g.
// `**Example:**` precedes a fence too), so this build-time transform rewrites
// ONLY captions that look like a filename into `<div class="code-filename">…`,
// which pages/theme.css styles as the header bar. Author bold paragraphs are
// left untouched.

// A bold-only caption line: the whole line is `**…**`.
const BOLD_ONLY = /^\*\*([^*]+)\*\*[ \t]*$/
// Looks like `name.ext` (no whitespace, extension starts with a letter). Matches
// lib.rs / package.json / .yarnrc.yml / index.d.ts; rejects "Example:" and
// "directory structure".
const FILENAME = /^\S+\.[A-Za-z][\w-]*$/

function isFenceOpener(line: string): boolean {
  return /^[ \t]*(`{3,}|~{3,})/.test(line)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Rewrite filename captions (`**lib.rs**` immediately before a code fence) to a
 * `<div class="code-filename">` header element. Pure string in/out; returns the
 * input unchanged when there is nothing to mark.
 */
export function markCodeFilenames(src: string): string {
  if (!src.includes('**')) return src
  const lines = src.split('\n')
  let changed = false
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(BOLD_ONLY)
    if (!m) continue
    const name = m[1].trim()
    if (!FILENAME.test(name)) continue
    // The next non-blank line must open a code fence for this to be a caption.
    let j = i + 1
    while (j < lines.length && lines[j].trim() === '') j++
    if (j < lines.length && isFenceOpener(lines[j])) {
      lines[i] = `<div class="code-filename">${escapeHtml(name)}</div>`
      changed = true
    }
  }
  return changed ? lines.join('\n') : src
}
