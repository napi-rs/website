// Changelog page body for `@napi-rs/cli`. Build-time baked static HTML (no loader,
// no hydration); the layout wraps it in `<main class="void-md">`. See napi.island.
import { NAPI_CLI_HTML } from '../../../lib/changelog/changelog-data.gen.ts'

export default function NapiCliChangelog() {
  return <div dangerouslySetInnerHTML={{ __html: NAPI_CLI_HTML }} />
}
