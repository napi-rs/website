// Root layout — wraps EVERY page (docs, blog, changelog, landing).
//
// Non-island by design: this file has no `.island` suffix, so it renders as
// static SSR HTML and ships zero JS of its own. (Per the islands plugin, only
// `*.island.tsx` entry files honour `with { island }` imports; this layout
// therefore intentionally marks nothing as an island. The docs CHROME islands
// live in the docs-level `pages/{en,cn,pt-BR}/docs/layout.island.tsx`.)
//
// Responsibilities:
//   • Load global CSS once: the app's Tailwind tokens (../style.css) and the
//     docs-content extras (./theme.css, scoped under .void-md).
//   • Provide a skip-to-content link for keyboard/screen-reader users.
//
// Site-wide <head> (titleTemplate, favicons, OG defaults, GA gtag, the
// data-theme dark default) is owned by void.json `head` (the config layer);
// the no-FOUC theme bootstrap is injected by middleware/01.head.ts. Head is NOT
// managed from this body component in Void's model.
import '../style.css'
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
