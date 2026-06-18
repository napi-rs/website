// Docs layout entry for the `pt-BR` locale (served under /pt-BR/docs/…).
//
// Island imports (`with { island }`) MUST live in this *.island.tsx file — they
// are ignored inside the shared DocsLayout. The integration phase wires the
// chrome islands here and passes them into <DocsLayout> via slot props, using
// locale="pt-BR". See pages/en/docs/layout.island.tsx for the full pattern.
import DocsLayout from '../../../components/docs/DocsLayout'

export default function PtBrDocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DocsLayout>{children}</DocsLayout>
}
