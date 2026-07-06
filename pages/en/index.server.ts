import { defineHandler, defineHead, type InferProps } from 'void'

import { getCachedSponsors } from '../../lib/landing/get-sponsors.ts'
import type { KVStore } from '../../lib/sponsors-cache/store.ts'

// Opt OUT of auto-prerender so the per-request COOP/COEP isolation headers from
// void.json (routing.headers `/en`) are applied on every request — a prerendered
// static page would bypass them and the in-browser WASM demo would not be
// cross-origin isolated. Matches the reference Image app's playground.
export const prerender = false

// Loader runs on GET; its return becomes the page (default export) props.
export const loader = defineHandler(async (c) => ({
  sponsors: await getCachedSponsors((c.env as unknown as { KV?: KVStore }).KV),
}))

export type Props = InferProps<typeof loader>

export const head = defineHead<Props>(() => ({
  title: 'NAPI-RS',
  // The landing page carries its own description (matching napi.rs); content
  // pages get theirs from frontmatter. middleware/01.head.ts mirrors this into
  // og:description.
  meta: [
    {
      name: 'description',
      content: 'NAPI-RS is a framework for building Node.js addons in Rust.',
    },
  ],
}))
