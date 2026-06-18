// Changelog page body for `@napi-rs/cli`. Loader-driven static HTML (no
// hydration); the layout wraps it in `<main class="void-md">`. See napi.island.
import type { Props } from './napi-cli.server.ts'

export default function NapiCliChangelog({ html }: Props) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
