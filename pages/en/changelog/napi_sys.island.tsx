// Changelog page body for `napi-sys`. Build-time baked static HTML (no loader,
// no hydration); the layout wraps it in `<main class="void-md">`. See napi.island.
import { NAPI_SYS_HTML } from '../../../lib/changelog/changelog-data.gen.ts'

export default function NapiSysChangelog() {
  return <div dangerouslySetInnerHTML={{ __html: NAPI_SYS_HTML }} />
}
