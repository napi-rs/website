// The support-matrix badge URL-builder, served at `/support-matrix` (en-only, no
// locale prefix — distinct from the /support-matrix.svg|png edge routes, whose
// paths carry the extension). It is a small maintainer tool: paste your
// `napi.targets`, mark tiers, set engines, and it generates the long
// self-contained badge URL + copy-paste README snippets, with a live preview.
//
// Full-bleed within the shared root layout (pages/layout.tsx) — that root layout
// loads the global Tailwind CSS + dark bootstrap, so this page must NOT set
// `layout = false` (doing so drops all global styling). Island imports MUST be
// relative (Void's islands plugin ignores the `@/` alias).
import Navbar from '../components/docs/Navbar' with { island: 'load' }
// Footer carries the theme + language toggles on chrome-only pages; `locale`
// makes it render them. Island so those toggles hydrate.
import Footer from '../components/docs/Footer' with { island: 'load' }
// The interactive builder itself — a `load` island so its form state hydrates.
import SupportMatrixBuilder from '../components/support-matrix-builder/index' with {
  island: 'load',
}

export default function SupportMatrixPage() {
  return (
    <>
      <header
        className="sticky top-0 z-50 dark bg-background text-foreground"
        data-theme="dark"
      >
        <Navbar locale="en" currentPath="/support-matrix" />
      </header>
      <main
        id="main-content"
        className="dark min-h-screen bg-background text-foreground"
        data-theme="dark"
      >
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-2xl font-bold">Support matrix badge builder</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Generate the self-contained <code>/support-matrix.svg</code> /{' '}
            <code>.png</code> badge URL for your package&rsquo;s README. Paste
            your <code>napi.targets</code>, mark each target&rsquo;s tier, set
            your <code>engines</code> range, and copy the snippet — the image
            renders at the edge from the query string, so there is nothing to
            host.
          </p>
          <div className="mt-8">
            <SupportMatrixBuilder />
          </div>
        </div>
      </main>
      <footer
        className="dark border-t border-border bg-background text-foreground"
        data-theme="dark"
      >
        <Footer locale="en" />
      </footer>
    </>
  )
}
