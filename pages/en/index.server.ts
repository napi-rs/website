import { defineHandler, defineHead, type InferProps } from 'void'

import { loadSponsors } from '../../lib/landing/load-sponsors.ts'

// Opt OUT of auto-prerender so the per-request COOP/COEP isolation headers from
// void.json (routing.headers `/en`) are applied on every request — a prerendered
// static page would bypass them and the in-browser WASM demo would not be
// cross-origin isolated. Matches the reference Image app's playground.
export const prerender = false

// Loader runs on GET; its return becomes the page (default export) props.
export const loader = defineHandler(async () => ({
  sponsors: await loadSponsors(),
}))

export type Props = InferProps<typeof loader>

export const head = defineHead<Props>(() => ({
  title: 'NAPI-RS',
}))
