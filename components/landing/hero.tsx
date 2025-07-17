import dynamic from 'next/dynamic';

import { PrimaryGradTitle } from './ui'

const HeroDiagram = dynamic(() => import('./hero-diagram'), {
  ssr: false, // This ensures the component is not SSR'd,
});

// @Ref: https://github.com/vitejs/vite/blob/main/docs/.vitepress/theme/components/landing/1.%20hero-section/HeroSection.vue
export function Hero () {
  return (
    <div className="hero">
      <div className="container">
        {/* Heading */}
        <h1>Building pre-compiled<br />Node.js addons in Rust</h1>

        {/* Tagline */}
        <h3>
          Seamless WebAssembly integration, safer API designs with lifetime management, and simplified cross-compilation for broader platform support.
        </h3>

        {/* CTA Buttons */}
        <div className="hero__actions">
          <a href="/docs/introduction/getting-started" className="btn btn--primary">Get Started</a>
          <a
            href="https://github.com/napi-rs/napi-rs"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--outline"
          >
            <img src="/assets/github.svg" alt="GitHub logo" width={20} height={20} />
            GitHub
          </a>
        </div>
      </div>

      {/* Animated Diagram */}
      <HeroDiagram />
    </div>
  )
}
