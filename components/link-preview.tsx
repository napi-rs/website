import { ExternalLink } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import mdnLogo from '../public/assets/mdn.png'

// `data` is the JSON-serialized link-preview metadata for `href`, baked at build
// time by scripts/fetch-link-previews.mjs into lib/docs/link-preview-data.json
// and injected as the island's `data` prop by scripts/convert-content.mjs (the
// legacy Nextra `getStaticProps`/`useSSG` path no longer exists under @void/md).
export function LinkPreview({ href, data }: { href: string; data?: string }) {
  let meta: {
    json: {
      title: string
      body: string
      user: { login: string }
      repoUrl: string
    }
    og: string
    userAvatar: string
  } | null = null
  try {
    meta = data ? JSON.parse(data) : null
  } catch {
    meta = null
  }
  // Missing/invalid/incomplete metadata must never crash the page — validate the
  // exact shape we read below (a parseable-but-malformed `data`, e.g. `{}` or a
  // hand-edited island prop, would otherwise throw at `linkMeta.title` or render
  // a blank card) and fall back to a plain anchor so the link is still usable.
  // This predicate mirrors the converter's `assertLinkPreviewEntry` exactly —
  // own properties only (Object.hasOwn), non-null non-array objects, and every
  // consumed string non-empty after trim — so the render-boundary guard accepts
  // precisely the entries the converter emits and nothing weaker. The converter
  // already guarantees this for generated pages; this is defense-in-depth.
  const ownObj = (o: any, k: string) =>
    o != null &&
    Object.hasOwn(o, k) &&
    typeof o[k] === 'object' &&
    o[k] !== null &&
    !Array.isArray(o[k])
  const ownStr = (o: any, k: string) =>
    o != null &&
    Object.hasOwn(o, k) &&
    typeof o[k] === 'string' &&
    o[k].trim().length > 0
  const valid =
    meta != null &&
    typeof meta === 'object' &&
    !Array.isArray(meta) &&
    ownObj(meta, 'json') &&
    ownStr(meta.json, 'title') &&
    ownStr(meta.json, 'body') &&
    ownObj(meta.json, 'user') &&
    ownStr(meta.json.user, 'login') &&
    ownStr(meta.json, 'repoUrl') &&
    ownStr(meta, 'og') &&
    ownStr(meta, 'userAvatar')
  if (!valid) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {href}
      </a>
    )
  }
  const { json: linkMeta, og, userAvatar } = meta
  const logo = href.includes('mozilla') ? (
    <img
      src={mdnLogo}
      style={{ verticalAlign: 'text-bottom', marginRight: '4px' }}
      width={16}
      height={16}
    />
  ) : (
    <Github
      style={{
        width: '16px',
        height: '16px',
        display: 'inline-block',
      }}
    />
  )
  return (
    // The below-card separation gap lives on this wrapper's OWN margin, not on
    // the Card's marginBottom. The wrapper carries the onClick + cursor-pointer,
    // and a flex item's margin sits INSIDE the wrapper's box — so a gap placed
    // there becomes part of the click target (clicking the whitespace below the
    // card opens the link). A margin on the wrapper is outside its hit area:
    // separation without a dead-click strip. Matches napi.rs's ~24px gap below.
    <div
      className="flex justify-center w-full cursor-pointer"
      style={{ marginBottom: '24px' }}
      onClick={() => {
        window.open(href, '_blank')
      }}
    >
      <Card
        className="w-full gap-2 py-3 backdrop-blur"
        style={{ border: 'solid 1px oklch(0.922 0 0)', marginTop: '10px' }}
      >
        <CardHeader>
          <CardTitle className="text-shadow-lg">
            {linkMeta.title}{' '}
            <span className="text-sm font-light">
              <span
                style={{
                  backgroundImage: `url(data:image/png;base64,${userAvatar})`,
                  backgroundSize: 'cover',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'inline-block',
                  verticalAlign: 'text-bottom',
                  marginLeft: '4px',
                }}
              />{' '}
              @{linkMeta.user.login}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-between">
          <div className="flex-col justify-between w-1/2 flex">
            {/* Inline `margin: 0` (NOT a `my-0` class): the card lives inside
                @void/md prose, whose `.void-md p { margin-bottom: 14px }` rule
                (specificity 0,1,1) outranks a `.my-0` utility (0,1,0), so the
                class is ignored and the footer gets pushed up (measured 27px vs
                napi.rs's 13px). An inline style wins, resetting it so the footer
                sits tight to the card bottom. */}
            <p
              className="link-preview-body line-clamp-4 text-sm"
              style={{ margin: 0 }}
            >
              {linkMeta.body}
            </p>
            <p className="flex text-sm align-center" style={{ margin: 0 }}>
              <span className="inline-block align-middle">{logo}</span>
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'inline-block',
                }}
              >
                {linkMeta.repoUrl}
              </span>
              <ExternalLink
                style={{ marginLeft: '30px', marginTop: '2px' }}
                size={16}
              />
            </p>
          </div>
          <div className="flex w-2/5">
            <img src={`data:image/png;base64,${og}`} alt="preview" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function Github({ style }) {
  return (
    <svg
      className="w-5 h-5 mr-2"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

// The @void/md island import is a DEFAULT import (`import LinkPreview from ...`),
// so a default export is required. The named export is kept for other callers.
export default LinkPreview
