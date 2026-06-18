// Docs layout entry for the `en` locale (served at the ROOT: /docs/…).
//
// THIS is where island imports must live (verified: `with { island }` is only
// honoured in `*.island.tsx` entry files — never in the shared DocsLayout). The
// chrome islands are imported here with their island attribute and passed into
// the shared structural <DocsLayout> via its slot props. Static chrome
// (Breadcrumb, Pager, EditOnGithub, Footer) is imported normally.
//
// PATH / SHARED DATA: islands hydrate WITHOUT a Router/Shared context (the Void
// island client calls `hydrateRoot(el, createElement(Component, props))` with no
// providers), and the SSR page render has no RouterContext either. So neither
// `useRouter()` nor `useShared()` works reliably inside the chrome components.
// Instead, middleware/03.page-path.ts publishes the public route path on
// `shared.path`, and 02.i18n-fallback publishes `shared.i18nFallback`. This
// layout runs at SSR INSIDE the SharedContext, reads both via `useShared()`, and
// threads them down as serializable props (currentPath / fallback) — which are
// embedded into each island's data-props and thus available on hydration.
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

export default function EnDocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const shared = useShared<{ i18nFallback?: boolean; path?: string }>()
  const currentPath = shared?.path ?? ''
  const fallback = shared?.i18nFallback ?? false
  // On an i18n fallback the EN layout renders for a non-en URL; show the banner
  // in the USER's target locale (derived from the public path), not en.
  const bannerLocale = getLocale(currentPath)

  return (
    <DocsLayout
      navbar={<Navbar locale="en" currentPath={currentPath} />}
      sidebar={<Sidebar locale="en" currentPath={currentPath} />}
      toc={<Toc locale="en" currentPath={currentPath} />}
      banner={<NotTranslatedBanner locale={bannerLocale} fallback={fallback} />}
      breadcrumb={<Breadcrumb locale="en" currentPath={currentPath} />}
      pager={<Pager locale="en" currentPath={currentPath} />}
      editOnGithub={<EditOnGithub locale="en" currentPath={currentPath} />}
      footer={<Footer />}
    >
      {children}
    </DocsLayout>
  )
}
