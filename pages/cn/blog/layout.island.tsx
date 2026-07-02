// Blog layout entry for the `cn` locale (served under /cn/blog/…).
//
// Mirrors pages/cn/docs/layout.island.tsx — the same shared <DocsLayout> shell
// with the chrome island slots, fixed to locale="cn". The chrome components
// derive their active section from `shared.path` (a `/cn/blog/…` URL drives the
// blog tab/sidebar/breadcrumb/pager). Island imports (`with { island }`) MUST
// live in this *.island.tsx file. See pages/en/docs/layout.island.tsx for the
// PATH / SHARED DATA rationale; this layout reads `shared.path` and
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

export default function CnBlogLayout({
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
