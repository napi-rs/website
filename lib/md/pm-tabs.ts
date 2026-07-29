// Package-manager tabs — rewrite a `::: pm` container of per-pm code fences
// into raw HTML that pages/theme.css turns into a synced tab group.
//
// Authoring syntax (one fence per package manager, pm keyword LAST in the info
// string so the language still highlights):
//
//   ::: pm
//   ```bash npm
//   npx napi build
//   ```
//   ```bash yarn
//   yarn napi build
//   ```
//   :::
//
// Output shape (blank lines between raw HTML and the fences so the CommonMark
// html_block ends and the inner fences still parse as markdown):
//
//   <div class="pm-tabs">
//   <input type="radio" class="pm-input" name="pm" value="npm" id="pm-pm1-npm"><label for="pm-pm1-npm">npm</label>
//   …one input+label per pm, in first-appearance order…
//   <div class="pm-panel" data-pm="npm">
//
//   ```bash
//   npx napi build
//   ```
//
//   </div>
//   …
//   </div>
//
// Design notes:
//  • Each group gets its OWN radio-group name (`pm-<uid>`): every visual tab
//    bar is a standalone radio group, so keyboard arrow navigation and the
//    single-tab-stop behavior stay local to the bar the user is operating
//    (a page-wide shared name made arrows jump across distant blocks).
//  • Cross-group sync + persistence is JavaScript (delegated change listener
//    in middleware/01.head.ts checks the same value in every group); the CSS
//    is group-local (`:has` scoped to each `.pm-tabs`), so an unsynced/no-JS
//    page still renders each bar correctly on its own.
//  • The per-block uid (pm1, pm2, …) makes the input id / label for unique.
//  • A fence whose info string has NO pm keyword belongs to the previous
//    panel (multi-fence panels). Content before the first pm fence is
//    dropped — keep it simple: only fences inside `::: pm`.
//  • Pure + idempotent: input that already contains the emitted markup (no
//    `::: pm` fences left) passes through unchanged.
//
// Runs in the `napi-rs-md-code-blocks` Vite pre-transform (enforce:'pre'),
// BEFORE @void/md compiles the page — see vite.config.ts.

/** Package managers we recognise as tab keywords, in canonical order. */
const PM_KEYWORDS = ['npm', 'yarn', 'pnpm', 'bun'] as const
type Pm = (typeof PM_KEYWORDS)[number]

const PM_SET: ReadonlySet<string> = new Set(PM_KEYWORDS)

// `::: pm` opener / `:::` closer, tolerating up to 3 leading spaces (more is
// an indented code block in CommonMark, which we must NOT rewrite).
const OPEN_RE = /^ {0,3}:::[ \t]*pm[ \t]*\r?$/
const CLOSE_RE = /^ {0,3}:::[ \t]*\r?$/

// A code-fence opener: indent (≤3 spaces), fence run, optional info string.
// `.` excludes \r, so anchor with an explicit optional \r for CRLF safety.
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})[^\S\r\n]*(.*?)\r?$/

/** Extract the trailing pm keyword from a fence info string, if present. */
function pmOfInfo(info: string): Pm | null {
  const tokens = info.trim().split(/\s+/)
  const last = tokens[tokens.length - 1]?.toLowerCase()
  return last && PM_SET.has(last) ? (last as Pm) : null
}

/** Strip the trailing token (the pm keyword) from a fence OPENER line, CRLF-safe. */
function stripPmFromInfo(openerLine: string): string {
  return openerLine
    .replace(/[^\S\r\n]+\S+[ \t]*(\r?)$/, '$1')
    .replace(/[ \t]+(\r?)$/, '$1')
}

/** Is this line the closing fence matching `fence` (same char, run >= open)? */
function isClosingFence(line: string, fence: string): boolean {
  const re = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \t]*\r?$`)
  return re.test(line)
}

interface Panel {
  pm: Pm
  /** Original fence lines (opener with the pm keyword stripped … closer). */
  fences: string[][]
}

/**
 * Rewrite every `::: pm` container in `markdown`. Pure string in, string out.
 * Returns the input unchanged when there is no `::: pm` block (idempotent:
 * already-transformed input has none).
 */
export function transformPmTabs(markdown: string): string {
  // Cheap bail-out (also the idempotence guard): no container opener at all.
  if (!/^ {0,3}:::[ \t]*pm[ \t]*\r?$/m.test(markdown)) return markdown

  const lines = markdown.split('\n')
  const out: string[] = []
  let blockUid = 0
  let i = 0

  while (i < lines.length) {
    if (!OPEN_RE.test(lines[i])) {
      out.push(lines[i])
      i++
      continue
    }

    // Collect the block body up to the closing `:::` (or EOF — be tolerant).
    i++
    const body: string[] = []
    while (i < lines.length && !CLOSE_RE.test(lines[i])) {
      body.push(lines[i])
      i++
    }
    i++ // consume the closer (or step past EOF)

    // Parse the body into panels: each fence whose info string ends with a pm
    // keyword starts a new panel; keyword-less fences extend the current one.
    const panels: Panel[] = []
    let current: Panel | null = null
    let j = 0
    while (j < body.length) {
      const open = body[j].match(FENCE_OPEN_RE)
      // A fence opener must have an info string or be a bare fence; a line
      // like "```bash npm" matches with info "bash npm". Non-fence content is
      // ignored (only fences are supported inside `::: pm`).
      if (!open) {
        j++
        continue
      }
      const [, fence, rawInfo] = open
      const openerLine = body[j]
      const info = rawInfo.trim()
      // Find the matching closer.
      const fenceLines: string[] = []
      j++
      while (j < body.length && !isClosingFence(body[j], fence)) {
        fenceLines.push(body[j])
        j++
      }
      const closerLine = j < body.length ? body[j] : fence
      if (j < body.length) j++ // consume the closer

      const pm = pmOfInfo(info)
      if (pm) {
        // Strip the pm keyword (the last info token) from the ORIGINAL opener,
        // preserving the fence run + remaining info verbatim.
        const opener = stripPmFromInfo(openerLine)
        current = { pm, fences: [[opener, ...fenceLines, closerLine]] }
        panels.push(current)
      } else if (current) {
        // No pm keyword: this fence belongs to the previous panel.
        current.fences.push([openerLine, ...fenceLines, closerLine])
      }
      // else: a keyword-less fence before ANY pm fence is dropped (nothing to
      // attach it to) — keep it simple per the authoring contract.
    }

    if (panels.length === 0) {
      // Nothing usable inside — emit nothing (the container disappears rather
      // than rendering an empty tab bar).
      continue
    }

    blockUid++
    const uid = `pm${blockUid}`
    // Labels row: one input+label per pm, in order of FIRST appearance.
    const seen = new Set<Pm>()
    const orderedPms: Pm[] = []
    for (const p of panels) {
      if (!seen.has(p.pm)) {
        seen.add(p.pm)
        orderedPms.push(p.pm)
      }
    }

    out.push('<div class="pm-tabs">')
    for (const [idx, pm] of orderedPms.entries()) {
      // The FIRST tab is the group's default: CSS shows/marks it when the
      // group has no checked input. Radios share a PER-GROUP name
      // (`pm-<uid>`) so each tab bar is a proper standalone radio group for
      // keyboard/ARIA (arrow keys, one tab stop per bar); cross-group sync is
      // done by the delegated change listener in middleware/01.head.ts, and
      // the CSS is group-local (:has scoped to each .pm-tabs).
      const dflt = idx === 0 ? ' data-pm-default' : ''
      out.push(
        `<input type="radio" class="pm-input" name="pm-${uid}" value="${pm}" id="pm-${uid}-${pm}"><label for="pm-${uid}-${pm}"${dflt}>${pm}</label>`,
      )
    }
    for (const [idx, panel] of panels.entries()) {
      const dflt = idx === 0 ? ' data-pm-default' : ''
      out.push(`<div class="pm-panel" data-pm="${panel.pm}"${dflt}>`)
      for (const fenceLines of panel.fences) {
        out.push('')
        out.push(...fenceLines)
        out.push('')
      }
      out.push('</div>')
    }
    out.push('</div>')
  }

  return out.join('\n')
}
