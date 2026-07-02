// Head defaults: per-locale <html lang> + no-FOUC dark-mode bootstrap.
//
// (1) <html lang> — void.json hardcodes `htmlAttrs.lang = "en"`, so cn/pt-BR
// (and the cn/pt-BR fallback URLs) wrongly emitted `lang="en"`. We override it
// from the PUBLIC ROUTE locale here (en -> "en", cn -> "zh-CN", pt-BR ->
// "pt-BR"). headDefaults `htmlAttrs` SHALLOW-merges over the void.json config
// (config < middleware < page; verified in node_modules/void/dist/pages/head.mjs
// resolveHead), so setting only `{ lang }` overrides the config `lang` while
// PRESERVING config's `data-theme: "dark"`. We set BOTH `script` and `htmlAttrs`
// in a SINGLE `c.set('headDefaults', …)` because the protocol reads one value
// (`c.get("headDefaults")`) — a second `set` would clobber the first.
//
// (2) Theme bootstrap — void.json sets `data-theme="dark"` as the SSR default so
// server HTML is already dark. The @void/md content theme keys off
// `[data-theme]`; Tailwind's `dark:` variant keys off the `.dark` class
// (`@custom-variant dark (&:is(.dark *))`). We reconcile the two BEFORE first
// paint via an inline <head> script: read the saved preference — `light` |
// `dark` | `system` — and resolve it (an UNSET preference DEFAULTS to `system`),
// then ALWAYS apply the resolved theme to BOTH `.dark` and `data-theme` (this MUST
// stay in lockstep with ThemeToggle's resolution). Default is SYSTEM: a first-time
// visitor follows the OS `prefers-color-scheme`. The script also registers a
// matchMedia listener so a live OS light/dark switch re-applies immediately while
// the preference is `system`/unset — this is the AUTHORITATIVE "follow system"
// handler (ThemeToggle no longer carries its own), so it works on every page even
// where no toggle island is mounted (e.g. a closed mobile drawer). The home/
// landing routes are dark-always regardless — their whole subtree (header, body,
// footer) carries its own `.dark` — so this html-level resolution is invisible
// there. The try/catch wraps ONLY the storage read (which can throw in private
// mode), falling back to system — so the DOM writes always run and never desync.
//
// The `01.` prefix orders this BEFORE `02.i18n-fallback.ts`. `script`/`htmlAttrs`
// from middleware are SSR-only (not re-applied on SPA navigation) — exactly right
// for a pre-paint bootstrap on the document load island pages always do.
//
// PUBLIC-PATH LOCALE (mirrors middleware/03.page-path.ts, verified vs `void dev`):
// the void.json static rewrite (`/docs/* -> /en/docs/:splat`) and the i18n
// fallback both mark the request rewritten; the user-facing path is then
// `c.originalUrl().pathname`. On a cn fallback this middleware runs twice: the
// re-dispatched (rewritten) pass is the one that renders, and there
// originalUrl() === the cn URL, so we resolve `cn` -> `zh-CN` correctly.

import { defineMiddleware } from 'void'
import { getLocale, htmlLang, splitLocale } from '../lib/docs/locale.ts'

// Inlined, IIFE-wrapped, no external deps. Kept minimal so it parses + executes
// before the browser paints. The try/catch guards ONLY the storage read; the
// DOM writes that follow always run so `.dark` and `data-theme` stay in sync.
const THEME_BOOTSTRAP = `(function(){
var mq=matchMedia("(prefers-color-scheme: dark)");
function read(){try{return localStorage.getItem("theme");}catch(_){return null;}}
function apply(dark){var e=document.documentElement;e.classList.toggle("dark",dark);e.setAttribute("data-theme",dark?"dark":"light");}
function resolve(t){return t==="light"?false:t==="dark"?true:mq.matches;}
apply(resolve(read()));
mq.addEventListener("change",function(){var t=read();if(t==="light"||t==="dark")return;apply(mq.matches);});
})();`

// Code-fence copy button. @void/md renders a <button class="copy"> in every
// `language-*` fence (and lib/changelog/render.ts mirrors that markup), but
// neither ships a click handler — the button was decorative. We attach ONE
// delegated listener on `document` so it works for every fence on every content
// page (docs/blog/changelog) without per-island wiring, and it keeps working
// across SPA navigation (the document + listener outlive page swaps; new fences
// just bubble to the same handler). On a successful copy we toggle `.copied`
// for ~2s — pages/theme.css swaps the clipboard glyph for a green check (and
// forces the otherwise hover-only button visible during feedback). The async
// Clipboard API is preferred; a hidden-textarea execCommand path is the
// fallback for non-secure / older contexts. A click is a user gesture, so the
// write is permitted.
const COPY_CODE = `(function(){
document.addEventListener("click",function(e){
var t=e.target;var b=t&&t.closest?t.closest("button.copy"):null;if(!b)return;
var w=b.parentElement;var c=w&&(w.querySelector("pre code")||w.querySelector("pre"));if(!c)return;
var text=c.textContent.replace(/\\n$/,"");
var ok=function(){b.classList.add("copied");if(b._ct)clearTimeout(b._ct);b._ct=setTimeout(function(){b.classList.remove("copied");},2000);};
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(ok).catch(function(){});}
else{try{var a=document.createElement("textarea");a.value=text;a.style.position="fixed";a.style.top="-9999px";document.body.appendChild(a);a.focus();a.select();document.execCommand("copy");document.body.removeChild(a);ok();}catch(_){}}
},false);
})();`

// Per-page Open Graph injection (mirrors live napi.rs):
//   • og:title       = the resolved <title> with the ` – NAPI-RS` template
//                      suffix stripped (frontmatter/defineHead title, or the
//                      `NAPI-RS` default for pages that set none).
//   • og:description = the page's <meta name="description"> content, or the
//                      site default below when a page declares none (changelog,
//                      blog posts without a description) — matching napi.rs.
//   • og:url         = the canonical URL, which ALWAYS carries the locale
//                      segment, even `en` (served at root): `/` ->
//                      https://napi.rs/en/ , `/docs/x` -> …/en/docs/x , a cn
//                      page -> https://napi.rs/cn/… .
// Void has no post-render head hook and headDefaults is resolved BEFORE the page
// renders (so it can't see the page's own title/description), so we rewrite the
// finished document <head> after next(). The build prerenderer dispatches pages
// through this same middleware, so the tags are baked into the static HTML too;
// runtime-rendered pages (landing, changelog) get them per request. The values
// are read straight from the already-escaped <title>/<meta>, so they are
// re-injected verbatim (no double-escaping).
const DEFAULT_DESCRIPTION =
  'NAPI-RS, a framework for building pre-compiled Node.js addons in Rust'

// The void.json titleTemplate is `%s – NAPI-RS` (spaced en-dash). Tolerate any
// dash variant defensively; anchored to the end so a page title is never eaten.
const TITLE_SUFFIX_RE = /\s+[–—-]\s+NAPI-RS\s*$/

/** Canonical, always-locale-prefixed og:url for a public route path. */
function canonicalUrl(publicPath: string): string {
  const [locale, rest] = splitLocale(publicPath)
  return rest
    ? `https://napi.rs/${locale}/${rest}`
    : `https://napi.rs/${locale}/`
}

export default defineMiddleware(async (c, next) => {
  const method = c.req.method
  // Resolve the PUBLIC route path the same way 03.page-path.ts does: a rewritten
  // request (edge `/docs/*` rewrite or the i18n fallback) exposes the user-facing
  // URL via originalUrl(); otherwise req.path already IS the public path.
  const publicPath =
    method === 'GET' || method === 'HEAD'
      ? c.isRewritten()
        ? (c.originalUrl()?.pathname ?? c.req.path)
        : c.req.path
      : c.req.path

  c.set('headDefaults', {
    script: [{ innerHTML: THEME_BOOTSTRAP }, { innerHTML: COPY_CODE }],
    htmlAttrs: { lang: htmlLang(getLocale(publicPath)) },
  })
  await next()

  // --- Per-page Open Graph tags (see the block comment above). ---
  // Only full HTML document responses; island SPA payloads / assets are skipped.
  if (method !== 'GET' && method !== 'HEAD') return
  const res = c.res
  if (!(res.headers.get('content-type') ?? '').includes('text/html')) return

  const html = await res.text()
  const headEnd = html.indexOf('</head>')
  // No <head> (a partial / empty HEAD body) or already injected (a prerendered
  // page passing back through at runtime): re-emit the body untouched.
  if (headEnd === -1 || html.includes('property="og:url"')) {
    c.res = new Response(html, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    })
    return
  }

  const head = html.slice(0, headEnd)
  const titleMatch = head.match(/<title>([\s\S]*?)<\/title>/i)
  const ogTitle = titleMatch
    ? titleMatch[1].replace(TITLE_SUFFIX_RE, '').trim() || 'NAPI-RS'
    : 'NAPI-RS'
  const descMatch = head.match(
    /<meta[^>]*name="description"[^>]*content="([^"]*)"/i,
  )
  const ogDescription = descMatch ? descMatch[1] : DEFAULT_DESCRIPTION

  const ogTags =
    `<meta property="og:title" content="${ogTitle}">` +
    `<meta property="og:description" content="${ogDescription}">` +
    `<meta property="og:url" content="${canonicalUrl(publicPath)}">`

  // Drop the now-stale Content-Length; the runtime recomputes it. All other
  // headers (Content-Type, the scoped COOP/COEP on landing routes) are kept.
  const headers = new Headers(res.headers)
  headers.delete('content-length')
  c.res = new Response(html.slice(0, headEnd) + ogTags + html.slice(headEnd), {
    status: res.status,
    statusText: res.statusText,
    headers,
  })
})
