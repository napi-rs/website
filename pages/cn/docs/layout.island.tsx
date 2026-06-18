// Docs layout entry for the `cn` locale (served under /cn/docs/…).
//
// Island imports (`with { island }`) MUST live in this *.island.tsx file — they
// are ignored inside the shared DocsLayout. The integration phase wires the
// chrome islands here and passes them into <DocsLayout> via slot props, using
// locale="cn". See pages/en/docs/layout.island.tsx for the full pattern.
import DocsLayout from '../../../components/docs/DocsLayout'

export default function CnDocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DocsLayout>{children}</DocsLayout>
}
