// Changelog page body for `@napi-rs/cli`. Build-time baked static HTML (no loader,
// no hydration); the layout wraps it in `<main class="void-md">`. See napi.island.
import html from 'virtual:changelog/napi-cli'

export default function NapiCliChangelog() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
