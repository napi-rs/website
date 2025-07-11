import { Ecosystem } from './ecosystem'

import { SectionTitle } from './section'

export function HomePage() {
  return (
    <div className="page-home">
      <section className="section section-partners">
        <div className="limit-narrow-container flex flex-col items-center">
          <SectionTitle className="mb-16 mt-11">Trusted Tech Ecosystem</SectionTitle>
          <Ecosystem />
        </div>
      </section>
    </div>
  )
}
