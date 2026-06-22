// Changelog page body for `napi-derive`. Build-time baked static HTML (no loader,
// no hydration); the layout wraps it in `<main class="void-md">`. See napi.island.
import html from 'virtual:changelog/napi-derive'

export default function NapiDeriveChangelog() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
