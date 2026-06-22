// Changelog page body for `napi-build`. Build-time baked static HTML (no loader,
// no hydration); the layout wraps it in `<main class="void-md">`. See napi.island.
import html from 'virtual:changelog/napi-build'

export default function NapiBuildChangelog() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
