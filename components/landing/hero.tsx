import type { ReactNode } from 'react'

import { HeroDiagram } from './hero-diagram'

// @Ref: https://github.com/vitejs/vite/blob/main/docs/.vitepress/theme/components/landing/1.%20hero-section/HeroSection.vue
//
// HeroDiagram mount-gates its render (an inert shell until mounted on the client)
// and keeps every `window` / gsap / ScrollTrigger access inside effects, so it is
// SSR-safe. BUT it only animates (and renders its brand-chip + svg flow) once its
// `useEffect` runs — i.e. once HYDRATED. A plain SSR child never hydrates under
// Void's islands model, so the diagram stayed an empty shell. The en landing
// entry therefore passes a hydrated HeroDiagram ISLAND in via `heroDiagram`; we
// render that when present and fall back to the static (shell-only) component
// otherwise (cn/pt-BR don't use this Hero at all).
export function Hero({ heroDiagram }: { heroDiagram?: ReactNode }) {
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

      {/* Animated Diagram — hydrated island from the page entry (see above) */}
      {heroDiagram ?? <HeroDiagram />}
    </div>
  )
}
