// Changelog page body for `napi-sys`. Build-time baked static HTML (no loader,
// no hydration); the layout wraps it in `<main class="void-md">`. See napi.island.
import html from 'virtual:changelog/napi-sys'

export default function NapiSysChangelog() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
