import { NodeJS, Rust } from './lang'

// Root is an `<h1>` (was a `<p>`) so the localized landing has exactly one
// top-level heading, matching the en hero. `.page-landing-locale h1` in
// landing.css resets the browser-default h1 sizing/margins back to the prose
// `p` values, so this stays visually identical to the previous paragraph.
export const TitlePTBR = () => (
  <h1>
    <span style={{ fontSize: '36px', fontWeight: 'bold' }}>NAPI-RS</span> é um
    framework para construir addons pré-compilados para <NodeJS /> em <Rust />.
  </h1>
)
