// No-FOUC dark-mode bootstrap.
//
// void.json sets `htmlAttrs.data-theme = "dark"` as the SSR default, so the
// server-rendered HTML is already dark. But the @void/md content theme keys off
// `[data-theme]` while Tailwind's `dark:` variant keys off the `.dark` class
// (`@custom-variant dark (&:is(.dark *))` in style.css). We must reconcile the
// two BEFORE first paint, honouring the user's saved preference, so there is no
// flash of the wrong theme.
//
// This injects a tiny inline <head> script (via `headDefaults.script`) that runs
// synchronously before the body renders. It:
//   1. reads localStorage('theme') ('light' | 'dark'); if unset, falls back to
//      `prefers-color-scheme`.
//   2. sets BOTH document.documentElement.classList.toggle('dark', isDark)
//      (Tailwind) AND setAttribute('data-theme', …) (@void/md) so the two
//      systems agree.
//
// The `01.` prefix orders this BEFORE `02.i18n-fallback.ts`. Per the head
// docs, `script` from middleware is concatenated into <head> and is SSR-only
// (not re-applied on SPA navigation) — exactly right for a pre-paint bootstrap:
// it runs once on the document load that island pages always do.

import { defineMiddleware } from 'void'

// Inlined, IIFE-wrapped, no external deps. Kept minimal so it parses + executes
// before the browser paints. `try/catch` guards private-mode localStorage throws.
const THEME_BOOTSTRAP = `(function(){try{
var t=localStorage.getItem("theme");
var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;
var e=document.documentElement;
e.classList.toggle("dark",d);
e.setAttribute("data-theme",d?"dark":"light");
}catch(_){}})();`

export default defineMiddleware(async (c, next) => {
  c.set('headDefaults', {
    script: [{ innerHTML: THEME_BOOTSTRAP }],
  })
  await next()
})
