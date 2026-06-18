// Blog layout entry for the `pt-BR` locale (served under /pt-BR/blog/…).
//
// Mirrors pages/pt-BR/docs/layout.island.tsx — the same shared <DocsLayout> shell
// with the chrome island slots, fixed to locale="pt-BR". The chrome components
// derive their active section from `shared.path` (a `/pt-BR/blog/…` URL drives
// the blog tab/sidebar/breadcrumb/pager). Island imports (`with { island }`)
// MUST live in this *.island.tsx file. See pages/en/docs/layout.island.tsx for
// the PATH / SHARED DATA rationale; this layout reads `shared.path` and
// `shared.i18nFallback` at SSR via useShared() and threads them down as props.
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

export default function PtBrBlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const shared = useShared<{ i18nFallback?: boolean; path?: string }>()
  const currentPath = shared?.path ?? ''
  const fallback = shared?.i18nFallback ?? false

  return (
    <DocsLayout
      navbar={<Navbar locale="pt-BR" currentPath={currentPath} />}
      sidebar={<Sidebar locale="pt-BR" currentPath={currentPath} />}
      toc={<Toc locale="pt-BR" currentPath={currentPath} />}
      banner={<NotTranslatedBanner locale="pt-BR" fallback={fallback} />}
      breadcrumb={<Breadcrumb locale="pt-BR" currentPath={currentPath} />}
      pager={<Pager locale="pt-BR" currentPath={currentPath} />}
      editOnGithub={<EditOnGithub locale="pt-BR" currentPath={currentPath} />}
      footer={<Footer />}
    >
      {children}
    </DocsLayout>
  )
}
