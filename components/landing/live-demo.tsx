import { FeatureSection } from './features'
import TransformImage from '@/components/transform-image'

import LiveDemoCode from './live-demo-code.mdx'

export function LiveDemo ({ children }) {
  return (
    <FeatureSection
      className="live-demo"
      title="Try Live demo"
      description="This is a sample app using NAPI-RS WebAssembly. You can transform the image to webp, jpeg or avif with different quality."
    >

      <div className="playground-wrapper" data-lg-reveal="fade">
        <div className="panel demo-panel" data-lg-reveal="layer-to-right">
          <div className="title-bar">Transform Image App</div>
          <TransformImage/>
        </div>
        <div className="panel code-panel" data-lg-reveal="layer-to-right">
          <div className="title-bar">Code</div>
          <LiveDemoCode />
        </div>
      </div>

    </FeatureSection>
  )
}
