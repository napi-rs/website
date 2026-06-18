import { HeroDiagram } from './hero-diagram'

// @Ref: https://github.com/vitejs/vite/blob/main/docs/.vitepress/theme/components/landing/1.%20hero-section/HeroSection.vue
//
// HeroDiagram is imported statically (the old code used
// `dynamic(() => import('./hero-diagram'), { ssr: false })`). It is SSR-safe on
// its own: it mount-gates its render (returns an inert shell until mounted on the
// client) and keeps every `window` / gsap / ScrollTrigger access inside effects,
// so importing and SSR-rendering it never touches browser-only globals.
export function Hero() {
  return (
    <div className="hero">
      <div className="container">
        {/* Heading */}
        <h1>
          Building pre-compiled
          <br />
          Node.js addons in Rust
        </h1>

        {/* Tagline */}
        <h3>
          Seamless WebAssembly integration, safer API designs with lifetime
          management, and simplified cross-compilation for broader platform
          support.
        </h3>

        {/* CTA Buttons */}
        <div className="hero__actions">
          <a
            href="/docs/introduction/getting-started"
            className="btn btn--primary"
          >
            Get Started
          </a>
          <a
            href="https://github.com/napi-rs/napi-rs"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--outline"
          >
            <img
              src="/assets/github.svg"
              alt="GitHub logo"
              width={20}
              height={20}
            />
            GitHub
          </a>
        </div>
      </div>

      {/* Animated Diagram */}
      <HeroDiagram />
    </div>
  )
}
