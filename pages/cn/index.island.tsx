// The `cn` localized landing root, served at `/cn`. Full-bleed within the shared
// root layout (pages/layout.tsx) — that root layout loads the global Tailwind
// CSS + dark bootstrap, so this page must NOT set `layout = false` (doing so
// dropped all global styling and rendered the page in Times/light).
//
// Unlike `/en` this is the SIMPLE localized landing (a port of the legacy
// index.cn.mdx prose), NOT the full GSAP HomePage. It reuses the shared JSON
// sponsor loader and the SSR-safe Sponsors / Ecosystem / SupportMatrix
// components. The only island is the shared site Navbar (matching live napi.rs);
// island imports MUST be relative (Void's islands plugin ignores the `@/` alias).
import Navbar from '../../components/docs/Navbar' with { island: 'load' }
// Footer carries the theme + language toggles on the landing (no sidebar). It is
// an island so those toggles hydrate; `locale` makes it render them. See the en
// landing entry for the full rationale.
import Footer from '../../components/docs/Footer' with { island: 'load' }
import { Badges } from '@/components/badges'
import { TitleZH } from '@/components/title.zh'
import { Sponsors, Ecosystem, SupportMatrix } from '@/components/landing'
import type { Props } from './index.server'

import '@/components/landing/style.css'
import './landing.css'

// Intro code demo ported verbatim from the legacy index.cn.mdx fences. These are
// plain string literals (not @void/md fences), so JSX never interprets the
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

export default function CnHome({ sponsors }: Props) {
  return (
    <>
      <header className="sticky top-0 z-50">
        <Navbar locale="cn" currentPath="/cn" />
      </header>
      <div className="page-home page-landing-locale">
        <div className="limit-narrow-container">
          <TitleZH />

          <Badges />

          <h2>轻松锈化你的 Node.js 应用!</h2>

          <pre className="shiki">
            <code>{LIB_RS}</code>
          </pre>

          <p>
            与 <code>CommonJS</code>， <code>esm</code> 模块系统兼容， 自动生成{' '}
            <code>.d.ts</code> 定义文件:
          </p>

          <pre className="shiki">
            <code>{MAIN_MJS}</code>
          </pre>

          <pre className="shiki">
            <code>{MAIN_CJS}</code>
          </pre>

          <h2>功能</h2>

          <p>
            🚀 为 <code>Node.js</code> 应用带来原生性能
          </p>
          <p>
            👷‍♂️ 由 <code>Rust</code> 编译器保障的内存安全
          </p>
          <p>
            ⚡️ <code>Rust</code> 与 <code>Node.js</code> 之间通过{' '}
            <code>Buffer</code> 和 <code>TypedArray</code> 实现零数据拷贝交互
          </p>
          <p>⚙️ 轻松并行代码</p>

          <h2>赞助</h2>
          <Sponsors sponsors={sponsors} />

          <h2>生态</h2>
          <Ecosystem />

          <h2>支持列表</h2>
          <SupportMatrix />

          <h2>相关项目</h2>
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
        <Footer locale="cn" />
      </footer>
    </>
  )
}
