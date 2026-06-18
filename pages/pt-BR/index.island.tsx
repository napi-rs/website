// The `pt-BR` localized landing root, served at `/pt-BR`. Full-bleed (no layout
// chain).
//
// Like `/cn` this is the SIMPLE localized landing (a port of the legacy
// index.pt-BR.mdx prose), NOT the full GSAP HomePage. It reuses the shared JSON
// sponsor loader and the SSR-safe Sponsors / Ecosystem / SupportMatrix
// components. Nothing here needs to hydrate, so there are no island imports.
import { Badges } from '@/components/badges'
import { TitlePTBR } from '@/components/title.pt-BR'
import { Sponsors, Ecosystem, SupportMatrix } from '@/components/landing'
import type { Props } from './index.server'

import '@/components/landing/style.css'
import './landing.css'

export const layout = false

export default function PtBrHome({ sponsors }: Props) {
  return (
    <div className="page-home page-landing-locale">
      <div className="limit-narrow-container">
        <TitlePTBR />

        <Badges />

        <h2>Rustifique o Node.js em poucas linhas!</h2>

        <p>
          🚀 Traga desempenho nativo para o <code>Node.js</code>
        </p>
        <p>
          👷‍♂️ Segurança de memória, garantida pelo compilador do{' '}
          <code>Rust</code>
        </p>
        <p>
          ⚡️ Transferência interativa de dados sem cópia entre <code>Rust</code>{' '}
          e <code>Node.js</code> via <code>Buffer</code> e{' '}
          <code>TypedArray</code>
        </p>
        <p>⚙️ Paralelismo em poucas linhas</p>

        <h2>Patrocinadores</h2>
        <Sponsors sponsors={sponsors} />

        <h2>Ecossistema</h2>
        <Ecosystem />

        <h2>Matriz de suporte</h2>
        <SupportMatrix />
      </div>
    </div>
  )
}
