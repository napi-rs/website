// Blog layout entry for the `en` locale (served at the ROOT: /blog/…).
//
// Mirrors pages/en/docs/layout.island.tsx exactly — the same shared <DocsLayout>
// structural shell with the same chrome island slots. The chrome components
// derive their active section from the public route path (`shared.path`), so a
// `/blog/…` URL drives the blog tab/sidebar/breadcrumb/pager with no per-section
// component changes (leafSection('blog/…') === 'blog').
//
// Island imports (`with { island }`) MUST live in this *.island.tsx file (they
// are ignored inside the shared DocsLayout). See the docs layout for the full
// PATH / SHARED DATA rationale: islands hydrate without a Router/Shared context,
// so we read `shared.path` (middleware/03.page-path.ts) and `shared.i18nFallback`
// (02.i18n-fallback.ts) at SSR via useShared() and thread them down as props.
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
import EditOnGithub from '../../../components/docs/EditOnGithub'
import Footer from '../../../components/docs/Footer'

export default function EnBlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const shared = useShared<{ i18nFallback?: boolean; path?: string }>()
  const currentPath = shared?.path ?? ''
  const fallback = shared?.i18nFallback ?? false

  // ROUTE locale vs CONTENT locale (see pages/en/docs/layout.island.tsx): the EN
  // layout renders en pages AND every i18n fallback (a cn/pt-BR /blog URL whose
  // page is untranslated rewrites to /en/blog/…), so the ROUTE locale may be
  // cn/pt-BR while the CONTENT (rendered .md) is ALWAYS en here. ROUTE locale
  // drives the chrome; CONTENT locale ('en') + the en md path drive TOC + edit.
  const routeLocale = getLocale(currentPath)

  return (
    <DocsLayout
      navbar={<Navbar locale={routeLocale} currentPath={currentPath} />}
      sidebar={<Sidebar locale={routeLocale} currentPath={currentPath} />}
      toc={<Toc locale="en" currentPath={currentPath} />}
      banner={<NotTranslatedBanner locale={routeLocale} fallback={fallback} />}
      breadcrumb={<Breadcrumb locale={routeLocale} currentPath={currentPath} />}
      pager={<Pager locale={routeLocale} currentPath={currentPath} />}
      editOnGithub={<EditOnGithub locale="en" currentPath={currentPath} />}
      footer={<Footer />}
    >
      {children}
    </DocsLayout>
  )
}
