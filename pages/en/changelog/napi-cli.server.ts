import { defineHandler, defineHead, type InferProps } from 'void'

import { loadChangelogHtml } from '../../../lib/changelog/load.ts'

// Edge-cache TTL (seconds). Belt-and-braces with void.json routing.revalidate.
export const revalidate = 300

// FILTER STRING for this page (matches legacy getStaticProps('@napi-rs/cli') —
// the npm package name, NOT a crate name). Releases whose name does not start
// with `@napi-rs/cli` are excluded.
export const loader = defineHandler(() =>
  loadChangelogHtml('@napi-rs/cli', 'en'),
)

export type Props = InferProps<typeof loader>

export const head = defineHead<Props>(() => ({
  title: '@napi-rs/cli',
}))
