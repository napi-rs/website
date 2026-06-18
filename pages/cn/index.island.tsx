// The `cn` localized landing root, served at `/cn`. Full-bleed (no layout chain).
//
// Unlike `/en` this is the SIMPLE localized landing (a port of the legacy
// index.cn.mdx prose), NOT the full GSAP HomePage. It reuses the shared JSON
// sponsor loader and the SSR-safe Sponsors / Ecosystem / SupportMatrix
// components. Nothing here needs to hydrate, so there are no island imports.
import { Badges } from '@/components/badges'
import { TitleZH } from '@/components/title.zh'
import { Sponsors, Ecosystem, SupportMatrix } from '@/components/landing'
import type { Props } from './index.server'

import '@/components/landing/style.css'
import './landing.css'

export const layout = false

export default function CnHome({ sponsors }: Props) {
  return (
    <div className="page-home page-landing-locale">
      <div className="limit-narrow-container">
        <TitleZH />

        <Badges />

        <h2>轻松锈化你的 Node.js 应用!</h2>

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
      </div>
    </div>
  )
}
