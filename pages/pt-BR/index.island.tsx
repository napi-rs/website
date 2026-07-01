// The `pt-BR` localized landing root, served at `/pt-BR`. Full-bleed within the
// shared root layout (pages/layout.tsx) — that root layout loads the global
// Tailwind CSS + dark bootstrap, so this page must NOT set `layout = false`
// (doing so dropped all global styling and rendered the page in Times/light).
//
// Like `/cn` this is the SIMPLE localized landing (a port of the legacy
// index.pt-BR.mdx prose), NOT the full GSAP HomePage. It reuses the shared JSON
// sponsor loader and the SSR-safe Sponsors / Ecosystem / SupportMatrix
// components. The only island is the shared site Navbar (matching live napi.rs);
// island imports MUST be relative (Void's islands plugin ignores the `@/` alias).
import Navbar from '../../components/docs/Navbar' with { island: 'load' }
// Footer carries the theme + language toggles on the landing (no sidebar). It is
// an island so those toggles hydrate; `locale` makes it render them. See the en
// landing entry for the full rationale.
import Footer from '../../components/docs/Footer' with { island: 'load' }
import { Badges } from '@/components/badges'
import { TitlePTBR } from '@/components/title.pt-BR'
import { Sponsors, Ecosystem, SupportMatrix } from '@/components/landing'
// Intro snippets pre-highlighted by scripts/build-demo-code.mjs (Shiki
// css-variables theme) so they render with napi.rs colors instead of monochrome.
// The token hex values are defined in landing.css under `.page-landing-locale
// pre.shiki`. Regenerate with `node scripts/build-demo-code.mjs`.
import {
  INTRO_LIB_RS_HTML,
  INTRO_MJS_HTML,
  INTRO_CJS_HTML,
} from '@/components/landing/live-demo-code.gen'
import type { Props } from './index.server'

import '@/components/landing/style.css'
import './landing.css'

export default function PtBrHome({ sponsors }: Props) {
  return (
    <>
      <header
        className="sticky top-0 z-50 dark bg-background text-foreground"
        data-theme="dark"
      >
        <Navbar locale="pt-BR" currentPath="/pt-BR" />
      </header>
      <div className="page-home page-landing-locale dark" data-theme="dark">
        <div className="limit-narrow-container">
          <TitlePTBR />

          <Badges />

          <h2>Rustifique o Node.js em poucas linhas!</h2>

          <div dangerouslySetInnerHTML={{ __html: INTRO_LIB_RS_HTML }} />

          <p>
            Compatível tanto com <code>CommonJS</code> quanto com{' '}
            <code>esm</code>, além do arquivo <code>.d.ts</code> ser gerado
            automaticamente:
          </p>

          <div dangerouslySetInnerHTML={{ __html: INTRO_MJS_HTML }} />

          <div dangerouslySetInnerHTML={{ __html: INTRO_CJS_HTML }} />

          <h2>Recursos</h2>

          <p>
            🚀 Traga desempenho nativo para o <code>Node.js</code>
          </p>
          <p>
            👷‍♂️ Segurança de memória, garantida pelo compilador do{' '}
            <code>Rust</code>
          </p>
          <p>
            ⚡️ Transferência interativa de dados sem cópia entre{' '}
            <code>Rust</code> e <code>Node.js</code> via <code>Buffer</code> e{' '}
            <code>TypedArray</code>
          </p>
          <p>⚙️ Paralelismo em poucas linhas</p>

          <h2>Patrocinadores</h2>
          <Sponsors sponsors={sponsors} />

          <h2>Ecossistema</h2>
          <Ecosystem />

          <h2>Matriz de suporte</h2>
          <SupportMatrix />

          <h2>Projetos relacionados</h2>
          <ul>
            <li>
              <a href="https://www.neon-bindings.com">neon</a>
            </li>
            <li>
              <a href="https://github.com/infinyon/node-bindgen">
                node-bindgen
              </a>
            </li>
          </ul>
        </div>
      </div>
      <footer className="border-t border-border">
        <Footer locale="pt-BR" />
      </footer>
    </>
  )
}
