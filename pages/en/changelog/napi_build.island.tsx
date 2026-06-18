// Changelog page body for `napi-build`. Loader-driven static HTML (no
// hydration); the layout wraps it in `<main class="void-md">`. See napi.island.
import type { Props } from './napi_build.server.ts'

export default function NapiBuildChangelog({ html }: Props) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
