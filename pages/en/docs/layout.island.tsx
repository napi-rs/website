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

  // ROUTE locale vs CONTENT locale (see the migration plan + task brief):
  //   • The EN layout renders en pages AND every i18n fallback (a cn/pt-BR URL
  //     whose page is untranslated — those always rewrite to /en/…). So the
  //     ROUTE locale (the URL the user is on) may be cn/pt-BR while the CONTENT
  //     (rendered .md) is ALWAYS en here.
  //   • ROUTE locale drives the CHROME: navbar tabs/active, sidebar, breadcrumb,
  //     pager, banner — they must match the URL the user navigates within.
  //   • CONTENT locale ('en') + the en md path drive the TOC headings lookup and
  //     the edit-on-GitHub source path — they must point at the rendered page.
  const routeLocale = getLocale(currentPath)

  // CONTENT locale + path: the rendered .md is ALWAYS en here. Toc/EditOnGithub
  // both compute their target as `mdPagePath(splitLocale(currentPath)[1], locale)`
  // / `pages/<locale>/<rest>`. splitLocale strips a cn/pt-BR prefix to the bare
  // leaf (e.g. `/cn/docs/cli/build` -> `docs/cli/build`), so passing the REAL
  // currentPath with locale="en" resolves to the en page (`/en/docs/cli/build`,
  // `pages/en/docs/cli/build.md`) on a fallback AND on a plain en route. (We must
  // pass currentPath itself, NOT `/en/${rest}` — en is served at the ROOT, so
  // splitLocale would treat a leading `en` segment as part of the leaf.)

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
