import dynamic from 'next/dynamic';

import { Hero } from './hero'
import { Ecosystem } from './ecosystem'
import { SupportMatrix } from './support-matrix'
import { Sponsors, BgLines } from './sponsors'
import { SectionTitle, SectionDesc } from './section'
import { LiveDemo } from './live-demo'
import { Heart } from './icons'
import { MagicalGradButton } from './ui'

const Luge = dynamic(() => import('./luge'), {
  ssr: false // This ensures the component is not SSR'd
});

export function HomePage() {
  return (
    <div className="page-home">
      <Luge />

      <Hero />

      <LiveDemo />

      <section className="section section-sponsors">
        <BgLines />
        <div className="limit-container flex flex-col items-center">
          <Heart />
          <SectionTitle>Sponsors</SectionTitle>
          <SectionDesc>NAPI-RS is supported by amazing sponsors</SectionDesc>
          <Sponsors />
          <a href="https://github.com/sponsors/napi-rs" target='_blank' data-lg-reveal="fade-to-top"><MagicalGradButton>Become a Sponsor</MagicalGradButton></a>
        </div>
      </section>

      <section className="section section-support-matrix" data-lg-reveal="fade">
        <div className="limit-container flex flex-col items-center">
          <div className="outline-box justify-center" data-lg-reveal="fade-to-top">
            <SectionTitle className='!mb-4'>Support Matrix</SectionTitle>
            <div className="dot-pattern" data-lg-reveal="text" data-lg-reveal-delay="0.1"></div>
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
