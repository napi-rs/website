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
// (2) Dark-mode bootstrap — void.json sets `data-theme="dark"` as the SSR
// default so server HTML is already dark. The @void/md content theme keys off
// `[data-theme]`; Tailwind's `dark:` variant keys off the `.dark` class
// (`@custom-variant dark (&:is(.dark *))`). We reconcile the two BEFORE first
// paint via an inline <head> script: read the saved preference, then ALWAYS
// apply the resolved theme to BOTH `.dark` and `data-theme`. The default (no
// saved preference) is DARK — matching the live napi.rs site (which is dark
// regardless of the OS `prefers-color-scheme`) and the void.json `data-theme:
// "dark"` SSR default, so there is no SSR→client theme flip. The try/catch wraps
// ONLY the storage read (which can throw in private mode), defaulting to dark on
// failure — so the DOM writes always run and the two theme systems never desync.
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
import { getLocale, htmlLang } from '../lib/docs/locale.ts'

// Inlined, IIFE-wrapped, no external deps. Kept minimal so it parses + executes
// before the browser paints. The try/catch guards ONLY the storage read; the
// DOM writes that follow always run so `.dark` and `data-theme` stay in sync.
const THEME_BOOTSTRAP = `(function(){
var d;try{var t=localStorage.getItem("theme");d=t?t==="dark":true;}catch(_){d=true;}
var e=document.documentElement;
e.classList.toggle("dark",d);
e.setAttribute("data-theme",d?"dark":"light");
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
})
