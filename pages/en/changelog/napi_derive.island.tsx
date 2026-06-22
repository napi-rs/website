// Changelog page body for `napi-derive`. Build-time baked static HTML (no loader,
// no hydration); the layout wraps it in `<main class="void-md">`. See napi.island.
import { NAPI_DERIVE_HTML } from '../../../lib/changelog/changelog-data.gen.ts'

export default function NapiDeriveChangelog() {
  return <div dangerouslySetInnerHTML={{ __html: NAPI_DERIVE_HTML }} />
}
