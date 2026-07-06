// Pure, edge-safe HTML-attribute escaper. NO fs / node imports — imported by
// lib/seo/head.ts, which runs on Cloudflare Workers.

/**
 * Escape a string for safe interpolation inside a double-quoted HTML attribute
 * (`content="…"`). `&` MUST be replaced first so the entities emitted for the
 * other characters are not themselves double-escaped.
 */
export function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Reverse `escapeAttr` / Void's identical head `escapeHtml` (which emits exactly
 * `&`, `<`, `>`, `"` — it does NOT escape `'`). Decode `&amp;` LAST so that a
 * double-encoded `&amp;lt;` decodes to the literal text `&lt;`, not to `<`
 * (otherwise `&lt;`→`<` would fire first, corrupting the payload).
 */
export function htmlDecode(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}
