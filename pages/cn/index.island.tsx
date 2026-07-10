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

export default function CnHome({ sponsors }: Props) {
  return (
    <>
      <header
        className="sticky top-0 z-50 dark bg-background text-foreground"
        data-theme="dark"
      >
        <Navbar locale="cn" currentPath="/cn" />
      </header>
      <div className="page-home page-landing-locale dark" data-theme="dark">
        <div className="limit-narrow-container">
          <TitleZH />

          <Badges />

          <h2>轻松锈化你的 Node.js 应用!</h2>

          <div dangerouslySetInnerHTML={{ __html: INTRO_LIB_RS_HTML }} />

          <p>
            与 <code>CommonJS</code>， <code>esm</code> 模块系统兼容， 自动生成{' '}
            <code>.d.ts</code> 定义文件:
          </p>

          <div dangerouslySetInnerHTML={{ __html: INTRO_MJS_HTML }} />

          <div dangerouslySetInnerHTML={{ __html: INTRO_CJS_HTML }} />

          <h2>功能</h2>

          <p>
            🚀 为 <code>Node.js</code> 应用带来原生性能
          </p>
          <p>
            👷‍♂️ 由 <code>Rust</code> 编译器保障的内存安全
          </p>
          <p>
            ⚡️ 通过 <code>Buffer</code> 和 <code>TypedArray</code> 在{' '}
            <code>Rust</code> 与 <code>Node.js</code>
            之间高效传输二进制数据，并可按需使用零拷贝视图
          </p>
          <p>⚙️ 轻松并行代码</p>

          <h2>赞助</h2>
          <Sponsors sponsors={sponsors} />

          <h2>生态</h2>
          <Ecosystem />

          <h2>支持与兼容性</h2>
          <p>
            Node-API 的 ABI 兼容范围、构建 CLI 的 Node.js
            要求，以及源码仓库当前持续测试的版本并不是同一件事。当前 CLI
            构建建议使用 Node.js 22.13+ 或 24+；源码仓库的主要矩阵测试 Node.js
            22、24 和 26。每个原生产物仍然只适用于其操作系统、CPU 和 libc 目标。
          </p>
          <SupportMatrix locale="cn" />
          <p>
            请阅读
            <a href="/cn/docs/more/support-compatibility">支持与兼容性</a>
            ，了解 Node-API 等级、运行时、模板目标和 CI 覆盖范围之间的区别。
          </p>

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
      <footer
        className="dark border-t border-border bg-background text-foreground"
        data-theme="dark"
      >
        <Footer locale="cn" />
      </footer>
    </>
  )
}
