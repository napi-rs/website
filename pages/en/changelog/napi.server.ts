import { defineHandler, defineHead, type InferProps } from 'void'

import { loadChangelogHtml } from '../../../lib/changelog/load.ts'

// Edge-cache TTL (seconds). Belt-and-braces with void.json routing.revalidate.
export const revalidate = 300

// FILTER STRING for this page (matches the legacy getStaticProps('napi')).
// NB: `startsWith('napi')` also matches napi-derive/sys/build releases — a
// faithfully-replicated legacy quirk, not a bug.
export const loader = defineHandler(() => loadChangelogHtml('napi', 'en'))

export type Props = InferProps<typeof loader>

export const head = defineHead<Props>(() => ({
  title: 'napi',
}))
