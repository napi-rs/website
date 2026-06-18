import { defineHandler, defineHead, type InferProps } from 'void'

import { loadChangelogHtml } from '../../../lib/changelog/load.ts'

// Edge-cache TTL (seconds). Belt-and-braces with void.json routing.revalidate.
export const revalidate = 300

// FILTER STRING for this page (matches legacy getStaticProps('napi-build') —
// the route stem `napi_build` maps to the hyphenated crate name).
export const loader = defineHandler(() => loadChangelogHtml('napi-build', 'en'))

export type Props = InferProps<typeof loader>

export const head = defineHead<Props>(() => ({
  title: 'napi-build',
}))
