import type { ReactNode } from 'react'

import { FeatureSection } from './features'
import { RUST_CODE_HTML, TS_CODE_HTML } from './live-demo-code.gen'

const LiveDemoTitle = () => {
  return (
    <div className="live-demo-title">
      Live WASM + <span>NAPI-RS</span> Demo
    </div>
  )
}

// The TS + Rust snippets that used to live in `live-demo-code.mdx`. @void/md only
// compiles `.md` (and the legacy file contained JSX between the fences), so the
// component-import path is gone. To preserve napi.rs's syntax highlighting (the
// inline-text fallback rendered MONOCHROME), the snippets are pre-highlighted
// with Shiki (github-dark, matching @void/md's dark theme) by
// scripts/build-demo-code.mjs into live-demo-code.gen.ts and injected here. The
// token colors are inline styles, so they render on the always-dark landing
// without any `.void-md`-scoped CSS; the structural `title-bar` divider and the
// `.code-panel pre` / `.line` rules in live-demo.css still apply to the emitted
// `<pre class="shiki">`.
function LiveDemoCode() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: TS_CODE_HTML }} />
      <div
        className="title-bar mt-1"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        Rust Code
      </div>
      <div dangerouslySetInnerHTML={{ __html: RUST_CODE_HTML }} />
    </>
  )
}

// `demo` is the T5 in-browser WASM image demo (components/transform-image/_Demo,
// default export TransformImage), passed in from the page entry as an island
// element so it hydrates `with { island: 'visible' }`. The `with { island }`
// attribute is only honoured in `.island.tsx` ENTRY files, so this component
// cannot own the island import itself — the entry threads it down. This replaces
// the old `dynamic(() => import('@/components/transform-image'), { ssr: false })`.
export function LiveDemo({ demo }: { demo?: ReactNode }) {
  return (
    <FeatureSection
      className="live-demo"
      title={<LiveDemoTitle />}
      description="This is a sample app using NAPI-RS WebAssembly. You can transform the image to webp, jpeg or avif with different quality."
    >
      <div className="playground-wrapper" data-lg-reveal="fade">
        <div className="panel demo-panel" data-lg-reveal="layer-to-right">
          <div className="title-bar">Transform Image App</div>
          {demo}
        </div>
        <div className="panel code-panel" data-lg-reveal="layer-to-right">
          <div className="title-bar">TS Code</div>
          <LiveDemoCode />
        </div>
      </div>

      <div
        className="live-demo-bg"
        data-lg-reveal="fade"
        data-lg-reveal-delay="1"
      />
    </FeatureSection>
  )
}
