import dynamic from 'next/dynamic';

import { Ecosystem } from './ecosystem'
import { SectionTitle } from './section'

const Luge = dynamic(() => import('./luge'), {
  ssr: false // This ensures the component is not SSR'd
});

export function HomePage() {
  return (
    <div className="page-home">
      <Luge />
      <section className="section section-partners">
        <div className="limit-narrow-container flex flex-col items-center">
          <SectionTitle className="mb-16 mt-11">Trusted Tech Ecosystem</SectionTitle>
          <Ecosystem />
        </div>
      </section>
    </div>
  )
}
