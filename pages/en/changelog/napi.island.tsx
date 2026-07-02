// Changelog page body for `napi`. NO loader: the full release history is fetched
// + rendered to HTML at BUILD time by the `napi-rs-changelog-data` Vite plugin
// (lib/changelog/plugin.ts) and imported from its virtual module, so this page
// auto-prerenders to static, cookie-agnostic HTML and hydrates NOTHING.
// `changelog/layout.island.tsx` wraps it in `<main class="void-md">` (the
// @void/md content theme styles it).
import html from 'virtual:changelog/napi'

export default function NapiChangelog() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
