import { defineHead } from 'void'

// No loader — build-time baked, auto-prerendered static page. See napi.server.ts.
export const prerender = true

export const head = defineHead(() => ({
  title: 'napi-sys',
}))
