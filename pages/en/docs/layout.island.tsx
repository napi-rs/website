// Docs layout entry for the `en` locale (served at the ROOT: /docs/…).
//
// THIS is where island imports must live (verified: `with { island }` is only
// honoured in `*.island.tsx` entry files — never in the shared DocsLayout). The
// integration phase wires the chrome islands HERE and passes them into the
// shared structural <DocsLayout> via its slot props. Pattern to follow:
//
//   import Navbar  from '../../../components/docs/Navbar'  with { island: 'load' }
//   import Sidebar from '../../../components/docs/Sidebar' with { island: 'load' }
//   import Toc     from '../../../components/docs/Toc'     with { island: 'visible' }
//   // NotTranslatedBanner: island 'load'; reads useShared().i18nFallback
//   // Static chrome (Breadcrumb, Pager, EditOnGithub, Footer): plain imports.
//
//   <DocsLayout
//     navbar={<Navbar locale="en" />}
//     sidebar={<Sidebar locale="en" />}
//     toc={<Toc />}
//     banner={<NotTranslatedBanner locale="en" />}
//     breadcrumb={<Breadcrumb locale="en" />}
//     pager={<Pager locale="en" />}
//     editOnGithub={<EditOnGithub locale="en" />}
//     footer={<Footer />}
//   >
//     {children}
//   </DocsLayout>
//
// Until the clusters land, this renders the skeleton (labeled placeholder slots)
// around the markdown body so the route is live and verifiable.
import DocsLayout from '../../../components/docs/DocsLayout'

export default function EnDocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DocsLayout>{children}</DocsLayout>
}
