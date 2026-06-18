// Changelog page body for `napi`. Loader-driven (its server.ts fetches GitHub
// releases and renders HTML), so it is a `.island.tsx` and not a `.md` — but it
// hydrates NOTHING (static HTML). The `changelog/layout.island.tsx` wraps this
// in `<main class="void-md">`, so we render the rendered HTML directly without
// re-wrapping (the @void/md content theme styles it via the layout's .void-md).
import type { Props } from './napi.server.ts'

export default function NapiChangelog({ html }: Props) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
