// DocsLayout — the shared docs SHELL (structural skeleton).
//
// ─────────────────────────────────────────────────────────────────────────
// ISLAND MECHANISM (empirically verified — see contract.islandMechanism):
// `import X from '...' with { island: 'load' }` is honoured ONLY inside a
// `*.island.tsx` entry file. The void-react islands plugin scans the literal
// source of `page.island` / `layout.island` / `namedLayout.island` files for
// the import-attribute regex and ONLY rewrites those files into `data-island`
// wrappers. An island import written in THIS file (a plain component) is a
// no-op: the component renders as static SSR HTML and never hydrates.
//
// Therefore: this DocsLayout is a STRUCTURAL component that takes the island
// components as PROPS (the "slots" below). The three docs layout entries
//   pages/{en,cn,pt-BR}/docs/layout.island.tsx
// own the `with { island }` imports and pass the hydrated components in here.
// Static chrome (breadcrumb, pager, edit-on-github, footer) is rendered with
// plain elements + <a> and may be passed as plain nodes or imported normally.
// ─────────────────────────────────────────────────────────────────────────
//
// Visual structure:
//   ┌──────────────────────────── header (navbar) ───────────────────────────┐
//   ├───────────┬─────────────────────────────────────────────┬──────────────┤
//   │  sidebar  │  banner? · breadcrumb · <main.void-md>       │     toc      │
//   │           │  pager · edit-on-github                      │              │
//   ├───────────┴─────────────────────────────────────────────┴──────────────┤
//   └──────────────────────────────── footer ─────────────────────────────────┘
//
// This file is a SKELETON: it lays out the slots in the correct structure with
// labeled placeholders. The component clusters (Navbar, Sidebar, Toc, Pager,
// Breadcrumb, EditOnGithub, NotTranslatedBanner, Footer) are filled in by the
// later integration phase via the slot props named below.
import '@void/md/theme-content.css'

export interface DocsLayoutSlots {
  /** SLOT: navbar — island ('load'). Logo, tabs, ThemeToggle, Search, LangSwitcher. */
  navbar?: React.ReactNode
  /** SLOT: sidebar — island ('load'). Collapsible section nav for the active tab. */
  sidebar?: React.ReactNode
  /** SLOT: toc — island ('visible'). Scroll-spy table of contents (h2–h3). */
  toc?: React.ReactNode
  /** SLOT: banner — static. NotTranslatedBanner (island 'load') is passed here when shown; empty otherwise. Designed to accept future banners. */
  banner?: React.ReactNode
  /** SLOT: breadcrumb — static. Home > tab > group > leaf. */
  breadcrumb?: React.ReactNode
  /** SLOT: pager — static. Prev/next links. */
  pager?: React.ReactNode
  /** SLOT: editOnGithub — static. "Edit this page on GitHub" link. */
  editOnGithub?: React.ReactNode
  /** SLOT: footer — static. Logo, license, copyright, attribution links. */
  footer?: React.ReactNode
}

export interface DocsLayoutProps extends DocsLayoutSlots {
  /** The rendered markdown page body. Wrapped in <main class="void-md">. */
  children: React.ReactNode
}

export default function DocsLayout({
  navbar,
  sidebar,
  toc,
  banner,
  breadcrumb,
  pager,
  editOnGithub,
  children,
  footer,
}: DocsLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* SLOT: navbar (island 'load') */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        {navbar ?? <div data-slot-placeholder="navbar" className="h-14" />}
      </header>

      {/* Body: [ sidebar | main | toc ] */}
      <div className="mx-auto flex w-full max-w-[1400px] gap-0">
        {/* SLOT: sidebar (island 'load') */}
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
          {sidebar ?? <div data-slot-placeholder="sidebar" />}
        </aside>

        {/* Center column */}
        <div className="min-w-0 flex-1 px-6 py-8">
          {/* SLOT: banner (static; NotTranslatedBanner passed here when shown) */}
          {banner ?? <div data-slot-placeholder="banner" hidden />}

          {/* SLOT: breadcrumb (static) */}
          {breadcrumb ?? <div data-slot-placeholder="breadcrumb" />}

          {/*
            The markdown body. DO NOT render an <h1> here — every .md page
            already contains its own `# title`. The .void-md wrapper scopes the
            @void/md content theme + pages/theme.css extras.
          */}
          <main id="main-content" className="void-md">
            {children}
          </main>

          {/* SLOT: pager (static) */}
          {pager ?? <div data-slot-placeholder="pager" />}

          {/* SLOT: editOnGithub (static) */}
          {editOnGithub ?? <div data-slot-placeholder="edit-on-github" />}
        </div>

        {/* SLOT: toc (island 'visible') */}
        <aside className="hidden w-56 shrink-0 xl:block">
          {toc ?? <div data-slot-placeholder="toc" />}
        </aside>
      </div>

      {/* SLOT: footer (static) */}
      <footer className="border-t border-border">
        {footer ?? <div data-slot-placeholder="footer" />}
      </footer>
    </div>
  )
}
