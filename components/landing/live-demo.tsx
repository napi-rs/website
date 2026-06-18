import type { ReactNode } from 'react'

import { FeatureSection } from './features'

const LiveDemoTitle = () => {
  return (
    <div className="live-demo-title">
      Live WASM + <span>NAPI-RS</span> Demo
    </div>
  )
}

// The TS + Rust snippets that used to live in `live-demo-code.mdx`. @void/md only
// compiles `.md` (and the legacy file contained JSX between the fences), so the
// component-import path is gone. The code is rendered inline as static
// preformatted markup, preserving the exact snippet content and the structural
// `title-bar` divider that the live-demo CSS (`.code-panel pre`) styles.
const TS_CODE = `import { Transformer } from '@napi-rs/image'

export async function transform() {
  const imageResponse = await fetch(
    'https://upload.wikimedia.org/wikipedia/commons/5/5d/ISS-45_EVA-2_%28a%29_Scott_Kelly.jpg'
  )

  const imageBytes = await imageResponse.arrayBuffer()

  const transformer = new Transformer(imageBytes)
  const webp = await transformer.toWebp()
}`

const RUST_CODE = `use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub struct Transformer {
  inner: Uint8Array,
}

#[napi]
impl Transformer {
  #[napi(constructor)]
  pub fn new(inner: Uint8Array) -> Self {
    Self { inner }
  }

  #[napi]
  pub fn to_webp(&self) -> Result<Uint8Array> {
    let image = image::load_from_memory(&self.inner)?;
    let webp = image.to_webp().map_err(|e| Error::from(e.to_string()))?;
    Ok(webp.into())
  }
}`

function LiveDemoCode() {
  return (
    <>
      <pre className="shiki">
        <code>
          <span className="line">{TS_CODE}</span>
        </code>
      </pre>
      <div
        className="title-bar mt-1"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        Rust Code
      </div>
      <pre className="shiki">
        <code>
          <span className="line">{RUST_CODE}</span>
        </code>
      </pre>
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
