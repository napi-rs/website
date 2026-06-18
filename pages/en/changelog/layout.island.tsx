// Changelog layout entry for the `en` locale (served at the ROOT: /changelog/…).
//
// Mirrors pages/en/docs/layout.island.tsx and pages/en/blog/layout.island.tsx:
// the same shared <DocsLayout> shell with the same chrome island slots. The
// chrome components derive their active section from the public route path
// (`shared.path`), so a `/changelog/…` URL drives the changelog tab / sidebar /
// breadcrumb / pager with no per-section component changes
// (leafSection('changelog/…') === 'changelog'). The changelog tab + breadcrumb
// reachability come from the ISLAND_PAGES supplement in lib/docs/page-data.ts
// (the 5 routes are NOT @void/md/pages markdown entries).
//
// Island imports (`with { island }`) MUST live in this *.island.tsx file (they
// are ignored inside the shared DocsLayout). See the docs layout for the full
// PATH / SHARED DATA rationale: islands hydrate without a Router/Shared context,
// so we read `shared.path` (middleware/03.page-path.ts) and `shared.i18nFallback`
// (02.i18n-fallback.ts) at SSR via useShared() and thread them down as props.
//
// EditOnGithub is intentionally OMITTED: the shared component derives a
// `pages/<locale>/<rest>.md` source path, but changelog pages are loader-driven
// (`*.island.tsx` + a GitHub-Releases fetch) with NO markdown source, so a
// "edit on GitHub" link would point at a non-existent file. Toc is also a no-op
// here (it reads @void/md/pages headings, which changelog has none of) and so
// renders nothing — harmless, kept for structural parity with docs/blog.
import { useShared } from '@void/react'

import { getLocale } from '../../../lib/docs/locale.ts'
import DocsLayout from '../../../components/docs/DocsLayout'
import Navbar from '../../../components/docs/Navbar' with { island: 'load' }
import Sidebar from '../../../components/docs/Sidebar' with { island: 'load' }
import Toc from '../../../components/docs/Toc' with { island: 'visible' }
import NotTranslatedBanner from '../../../components/docs/NotTranslatedBanner' with {
  island: 'load',
}
import Breadcrumb from '../../../components/docs/Breadcrumb'
import Pager from '../../../components/docs/Pager'
import Footer from '../../../components/docs/Footer'

export default function EnChangelogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const shared = useShared<{ i18nFallback?: boolean; path?: string }>()
  const currentPath = shared?.path ?? ''
  const fallback = shared?.i18nFallback ?? false

  // ROUTE locale vs CONTENT locale (see pages/en/docs/layout.island.tsx).
  // Changelog is EN-ONLY, so CONTENT is always en; the ROUTE locale still drives
  // the chrome so a cn/pt-BR route (should one ever reach here via fallback)
  // highlights correctly.
  const routeLocale = getLocale(currentPath)

  return (
    <DocsLayout
      navbar={<Navbar locale={routeLocale} currentPath={currentPath} />}
      sidebar={<Sidebar locale={routeLocale} currentPath={currentPath} />}
      toc={<Toc locale="en" currentPath={currentPath} />}
      banner={<NotTranslatedBanner locale={routeLocale} fallback={fallback} />}
      breadcrumb={<Breadcrumb locale={routeLocale} currentPath={currentPath} />}
      pager={<Pager locale={routeLocale} currentPath={currentPath} />}
      footer={<Footer />}
    >
      {children}
    </DocsLayout>
  )
}
