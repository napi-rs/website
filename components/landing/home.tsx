import dynamic from 'next/dynamic';

import { Ecosystem } from './ecosystem'
import { SupportMatrix } from './support-matrix'
import { SectionTitle, SectionDesc } from './section'

const Luge = dynamic(() => import('./luge'), {
  ssr: false // This ensures the component is not SSR'd
});

export function HomePage() {
  return (
    <div className="page-home">
      <Luge />

      <section className="section section-support-matrix">
        <div className="limit-container flex flex-col items-center">
          <SectionTitle>Support Matrix</SectionTitle>
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
