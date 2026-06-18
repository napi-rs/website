// Changelog page body for `napi-derive`. Loader-driven static HTML (no
// hydration); the layout wraps it in `<main class="void-md">`. See napi.island.
import type { Props } from './napi_derive.server.ts'

export default function NapiDeriveChangelog({ html }: Props) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
