// Changelog page body for `napi-sys`. Loader-driven static HTML (no hydration);
// the layout wraps it in `<main class="void-md">`. See napi.island.
import type { Props } from './napi_sys.server.ts'

export default function NapiSysChangelog({ html }: Props) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
