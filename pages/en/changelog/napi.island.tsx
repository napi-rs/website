// Changelog page body for `napi`. NO loader: the full release history is
// rendered to HTML at BUILD time (scripts/build-changelog.ts) and imported from
// the committed changelog-data.gen.ts, so this page auto-prerenders to static,
// cookie-agnostic HTML and hydrates NOTHING. `changelog/layout.island.tsx` wraps
// it in `<main class="void-md">` (the @void/md content theme styles it).
import { NAPI_HTML } from '../../../lib/changelog/changelog-data.gen.ts'

export default function NapiChangelog() {
  return <div dangerouslySetInnerHTML={{ __html: NAPI_HTML }} />
}
