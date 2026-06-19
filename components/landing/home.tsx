import type { ReactNode } from 'react'

import { Hero } from './hero'
import { Ecosystem } from './ecosystem'
import { SupportMatrix } from './support-matrix'
import { Sponsors, BgLines } from './sponsors'
import { SectionTitle, SectionDesc } from './section'
import { LiveDemo } from './live-demo'
import { Features } from './features'
import { Heart } from './icons'
import { MagicalGradButton } from './ui'
import type { WashedSponsors } from '@/lib/landing/sponsors'

import './style.css'

// Sponsors arrive from the page loader (pages/en/index.server.ts) and are passed
// straight through to <Sponsors>. There is no nested island here: the loader
// only feeds the page entry's default export, and inner islands receive props
// solely from their serialized JSX attributes — so Sponsors is rendered inline.
//
// `luge` and `demo` are the two interactive islands (the desktop-only luge
// scroll/reveal engine and the in-browser WASM image demo). The `with { island }`
// import attribute is ONLY honoured in `.island.tsx` PAGE ENTRY files (verified
// against @void/react's islands plugin: its transform/scan filter matches
// `*.island.{tsx,jsx}` entries only). So the entry — pages/en/index.island.tsx —
// owns those island imports and threads the resulting elements down here as
// props, where they render in place. This replaces the old
// `dynamic(() => import('./luge'), { ssr: false })` + `{ !isMobile && <Luge /> }`.
export function HomePage({
  sponsors,
  luge,
  demo,
  heroDiagram,
}: {
  sponsors: WashedSponsors
  luge?: ReactNode
  demo?: ReactNode
  heroDiagram?: ReactNode
}) {
  return (
    <div className="page-home">
      {luge}

      <Hero heroDiagram={heroDiagram} />

      <LiveDemo demo={demo} />

      <Features />

      <section className="section section-sponsors">
        <BgLines />
        <div className="limit-container flex flex-col items-center">
          <Heart />
          <SectionTitle>Sponsors</SectionTitle>
          <SectionDesc>NAPI-RS is supported by amazing sponsors</SectionDesc>
          <Sponsors sponsors={sponsors} />
          <a
            href="https://github.com/sponsors/napi-rs"
            target="_blank"
            data-lg-reveal="fade-to-top"
          >
            <MagicalGradButton>Become a Sponsor</MagicalGradButton>
          </a>
        </div>
      </section>

      <section className="section section-support-matrix" data-lg-reveal="fade">
        <div className="limit-container flex flex-col items-center">
          <div
            className="outline-box justify-center"
            data-lg-reveal="fade-to-top"
          >
            <SectionTitle className="!mb-4">Support Matrix</SectionTitle>
            <div
              className="dot-pattern"
              data-lg-reveal="text"
              data-lg-reveal-delay="0.1"
            ></div>
          </div>
          <SupportMatrix />
        </div>
      </section>

      <section className="section section-partners">
        <div className="limit-narrow-container flex flex-col items-center">
          <SectionTitle>Trusted Tech Ecosystem</SectionTitle>
          <Ecosystem />
        </div>
      </section>
    </div>
  )
}
