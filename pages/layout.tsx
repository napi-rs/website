// Root layout — wraps EVERY page (docs, blog, changelog, landing).
//
// Non-island by design: this file has no `.island` suffix, so it renders as
// static SSR HTML and ships zero JS of its own. (Per the islands plugin, only
// `*.island.tsx` entry files honour `with { island }` imports; this layout
// therefore intentionally marks nothing as an island. The docs CHROME islands
// live in the docs-level `pages/{en,cn,pt-BR}/docs/layout.island.tsx`.)
//
// Responsibilities:
//   • Load global CSS once, AT THE ENTRY LAYER (load-bearing — see below):
//     the app's Tailwind tokens (../style.css), @void/md's prose/code/container
//     theme (@void/md/theme-content.css, scoped under .void-md), then our
//     napi.rs overrides (./theme.css, also under .void-md).
//   • Provide a skip-to-content link for keyboard/screen-reader users.
//
// WHY @void/md/theme-content.css is imported HERE and not in DocsLayout:
// Tailwind v4's content scan prunes selectors from package CSS that is imported
// deep inside a plain component (DocsLayout is pulled in by the docs island
// entries) — only theme selectors corroborated by scanned app source survive.
// That silently dropped ALL of prose.css's bare-element rules (h1–h6, p,
// blockquote, table, hr, kbd, …) and its :root --vmd-* vars from the prod
// bundle (dev was fine — unpruned), so docs/blog/changelog headings collapsed
// to Tailwind preflight (16px/400). Importing it at this static root-layout
// entry — the same layer where style.css/theme.css already survive 100% — takes
// it out of the per-component prune path. Order is load-bearing: AFTER style.css
// and BEFORE theme.css, so our overrides win the cascade tie. It is harmless on
// non-docs pages (every rule is scoped to .void-md, which only the rendered
// markdown wrapper carries).
//
// Site-wide <head> (titleTemplate, favicons, OG defaults, GA gtag, the
// data-theme dark default) is owned by void.json `head` (the config layer);
// the no-FOUC theme bootstrap is injected by middleware/01.head.ts. Head is NOT
// managed from this body component in Void's model.
import '../style.css'
import '@void/md/theme-content.css'
import './theme.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      {children}
    </>
  )
}
