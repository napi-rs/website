// Docs layout entry for the `cn` locale (served under /cn/docs/…).
//
// Island imports (`with { island }`) MUST live in this *.island.tsx file — they
// are ignored inside the shared DocsLayout. The chrome islands are imported here
// and passed into <DocsLayout> via slot props, using locale="cn". Static chrome
// (Breadcrumb, Pager, EditOnGithub, Footer) is imported normally.
//
// PATH / SHARED DATA: see pages/en/docs/layout.island.tsx — islands hydrate with
// no Router/Shared context, so this layout reads `shared.path` (from
// middleware/03.page-path.ts) and `shared.i18nFallback` (from
// 02.i18n-fallback.ts) at SSR via useShared() and threads them down as
// serializable props.
import { useShared } from '@void/react'

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

export default function CnDocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const shared = useShared<{ i18nFallback?: boolean; path?: string }>()
  const currentPath = shared?.path ?? ''
  const fallback = shared?.i18nFallback ?? false

  return (
    <DocsLayout
      navbar={<Navbar locale="cn" currentPath={currentPath} />}
      sidebar={<Sidebar locale="cn" currentPath={currentPath} />}
      toc={<Toc locale="cn" currentPath={currentPath} />}
      banner={<NotTranslatedBanner locale="cn" fallback={fallback} />}
      breadcrumb={<Breadcrumb locale="cn" currentPath={currentPath} />}
      pager={<Pager locale="cn" currentPath={currentPath} />}
      editOnGithub={<EditOnGithub locale="cn" currentPath={currentPath} />}
      footer={<Footer />}
    >
      {children}
    </DocsLayout>
  )
}
