import { defineHandler, defineHead, type InferProps } from 'void'

import { getCachedSponsors } from '../../lib/landing/get-sponsors.ts'
import type { KVStore } from '../../lib/sponsors-cache/store.ts'

// prerender=false keeps the scoped COOP/COEP headers (void.json routing.headers
// `/cn`) applying on every request, matching `/en`.
export const prerender = false

export const loader = defineHandler(async (c) => ({
  sponsors: await getCachedSponsors((c.env as unknown as { KV?: KVStore }).KV),
}))

export type Props = InferProps<typeof loader>

export const head = defineHead<Props>(() => ({
  title: 'NAPI-RS',
  // Localized landing description (matching napi.rs/cn); mirrored into
  // og:description by middleware/01.head.ts.
  meta: [
    {
      name: 'description',
      content: 'NAPI-RS 是一个使用 Rust 构建预编译 Node.js 原生扩展的框架.',
    },
  ],
}))
