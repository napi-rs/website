import { defineHandler, defineHead, type InferProps } from 'void'

import { loadSponsors } from '../../lib/landing/load-sponsors.ts'

// prerender=false keeps the scoped COOP/COEP headers (void.json routing.headers
// `/pt-BR`) applying on every request, matching `/en`.
export const prerender = false

export const loader = defineHandler(async () => ({
  sponsors: await loadSponsors(),
}))

export type Props = InferProps<typeof loader>

export const head = defineHead<Props>(() => ({
  title: 'NAPI-RS',
  // Localized landing description (matching napi.rs/pt-BR); mirrored into
  // og:description by middleware/01.head.ts.
  meta: [
    {
      name: 'description',
      content: 'NAPI-RS é um framework para criar addons para Node.js em Rust.',
    },
  ],
}))
