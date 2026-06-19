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

// Intro code demo ported verbatim from the legacy index.pt-BR.mdx fences. These
// are plain string literals (not @void/md fences), so JSX never interprets the
// braces / angle brackets in the Rust `match` arms — they render literally.
const LIB_RS = `use napi_derive::napi;

#[napi]
fn fibonacci(n: u32) -> u32 {
  match n {
    1 | 2 => 1,
    _ => fibonacci(n - 1) + fibonacci(n - 2),
  }
}`

const MAIN_MJS = `import { fibonacci } from './index.js'

// output: 5
console.log(fibonacci(5))`

const MAIN_CJS = `const { fibonacci } = require('./index')

// output: 5
console.log(fibonacci(5))`

export const layout = false

export default function PtBrHome({ sponsors }: Props) {
  return (
    <div className="page-home page-landing-locale">
      <div className="limit-narrow-container">
        <TitlePTBR />

        <Badges />

        <h2>Rustifique o Node.js em poucas linhas!</h2>

        <pre className="shiki">
          <code>{LIB_RS}</code>
        </pre>

        <p>
          Compatível tanto com <code>CommonJS</code> quanto com <code>esm</code>
          , além do arquivo <code>.d.ts</code> ser gerado automaticamente:
        </p>

        <pre className="shiki">
          <code>{MAIN_MJS}</code>
        </pre>

        <pre className="shiki">
          <code>{MAIN_CJS}</code>
        </pre>

        <h2>Recursos</h2>

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

        <h2>Projetos relacionados</h2>
        <ul>
          <li>
            <a href="https://www.neon-bindings.com">neon</a>
          </li>
          <li>
            <a href="https://github.com/infinyon/node-bindgen">node-bindgen</a>
          </li>
        </ul>
      </div>
    </div>
  )
}
