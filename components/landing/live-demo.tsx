import { FeatureSection } from './features'
import dynamic from 'next/dynamic';

const TransformImage = dynamic(() => import('@/components/transform-image'), {
  ssr: false,
});

import LiveDemoCode from './live-demo-code.mdx'

const LiveDemoTitle = () => {
  return (
    <div className="live-demo-title">
      Live WASM + <span>NAPI-RS</span> Demo
    </div>
  )
}

export function LiveDemo () {
  return (
    <FeatureSection
      className="live-demo"
      title={<LiveDemoTitle />}
      description="This is a sample app using NAPI-RS WebAssembly. You can transform the image to webp, jpeg or avif with different quality."
    >

      <div className="playground-wrapper" data-lg-reveal="fade">
        <div className="panel demo-panel" data-lg-reveal="layer-to-right">
          <div className="title-bar">Transform Image App</div>
          <TransformImage />
        </div>
        <div className="panel code-panel" data-lg-reveal="layer-to-right">
          <div className="title-bar">Code</div>
          <LiveDemoCode />
        </div>
      </div>

      <div className="live-demo-bg" data-lg-reveal="fade" data-lg-reveal-delay="1" />

    </FeatureSection>
  )
}
