import { defineHead } from 'void'

// No loader: the changelog HTML is baked at BUILD time
// (scripts/build-changelog.ts → lib/changelog/changelog-data.gen.ts) and
// imported directly by napi.island.tsx. With no loader this page auto-prerenders
// to a static, cookie-agnostic asset; `prerender = true` makes that explicit.
// Refresh by regenerating the data file and redeploying.
export const prerender = true

export const head = defineHead(() => ({
  title: 'napi',
}))
