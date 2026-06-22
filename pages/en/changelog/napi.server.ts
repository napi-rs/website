import { defineHandler, defineHead, type InferProps } from 'void'

import {
  CHANGELOG_DEGRADED_REVALIDATE,
  loadChangelogHtml,
} from '../../../lib/changelog/load.ts'

// Edge-cache TTL (seconds). Belt-and-braces with void.json routing.revalidate.
export const revalidate = 300

// FILTER STRING for this page (matches the legacy getStaticProps('napi')).
// NB: `startsWith('napi')` also matches napi-derive/sys/build releases — a
// faithfully-replicated legacy quirk, not a bug.
export const loader = defineHandler(async (c) => {
  const { html, ok } = await loadChangelogHtml('napi', 'en')
  // GitHub-failed (degraded) render: shorten the edge-cache TTL so it
  // self-heals on the next request instead of being pinned for the full 300s.
  if (!ok) c.header('x-revalidate', String(CHANGELOG_DEGRADED_REVALIDATE))
  return { html }
})

export type Props = InferProps<typeof loader>

export const head = defineHead<Props>(() => ({
  title: 'napi',
}))
