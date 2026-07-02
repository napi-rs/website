// Pure generator for the `llms.txt` documentation index (https://llmstxt.org/).
//
// WHY a distinct file instead of Accept-header negotiation on the page URLs:
// Void serves prerendered pages from an edge/ISR cache that is keyed on PATH
// only (never on a request header) and sits IN FRONT of the worker — a cache
// HIT skips the worker entirely, so there is no place to inspect `Accept` and
// swap in markdown without turning every page into an uncached per-request
// render. Void's own "two representations of one page" feature (HTML vs the CSR
// loader JSON) works around this the same way: it emits the alternate at a
// DISTINCT path. So the framework-correct way to serve markdown to agents is
// distinct paths: the per-page `/…​.md` files (emitted by generate-sitemap.mjs)
// plus this discoverable, grouped index.
//
// This module is pure (nav in, markdown string out) so it is unit-testable and
// callable from the plain-ESM build script (scripts/generate-sitemap.mjs) as
// well as any Vite context.

import type { LocaleNav } from '../nav/index.ts'

export interface LlmsIndexOptions {
  /** Top-level `# ` heading (localized site title). */
  title: string
  /** One-line `> ` blockquote summary under the title. */
  summary: string
  /**
   * Resolve a nav leaf `path` (e.g. `docs/concepts/exports`) to the URL the
   * index should link to. The caller decides `.md` vs clean URL and locale
   * prefixing (it knows which sources actually emitted a `.md`).
   */
  hrefFor: (leafPath: string) => string
}

/**
 * Render a locale's navigation as an `llms.txt` markdown index: an `H1` + a
 * blockquote summary, then one `##` section per tab (Docs / Blog / Changelog),
 * with each non-flat group as an `###` sub-heading and every page as a bullet
 * link. Flat groups (blank `title`, e.g. blog/changelog) list their items
 * directly under the tab heading.
 */
export function buildLlmsIndex(nav: LocaleNav, opts: LlmsIndexOptions): string {
  const lines: string[] = [`# ${opts.title}`, '', `> ${opts.summary}`, '']

  for (const tab of nav.tabs) {
    const groups = nav.sidebar[tab.key] ?? []
    if (groups.length === 0) continue

    lines.push(`## ${tab.title}`, '')
    for (const group of groups) {
      // A non-blank group title is a real sidebar section header; blank means a
      // "flat" group whose items render directly under the tab.
      if (group.title) lines.push(`### ${group.title}`, '')
      for (const leaf of group.items) {
        lines.push(`- [${leaf.title}](${opts.hrefFor(leaf.path)})`)
      }
      lines.push('')
    }
  }

  // Collapse any accidental blank-line runs and end with exactly one newline.
  return `${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`
}
