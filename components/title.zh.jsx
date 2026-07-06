import { NodeJS, Rust } from './lang'

// Root is an `<h1>` (was a `<p>`) so the localized landing has exactly one
// top-level heading, matching the en hero. `.page-landing-locale h1` in
// landing.css resets the browser-default h1 sizing/margins back to the prose
// `p` values, so this stays visually identical to the previous paragraph.
export const TitleZH = () => (
  <h1>
    <span style={{ fontSize: '36px', fontWeight: 'bold' }}>NAPI-RS</span>{' '}
    是一个使用 <Rust /> 构建预编译 <NodeJS /> 原生扩展的框架
  </h1>
)
