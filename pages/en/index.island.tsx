// The `en` landing root, served at `/` (via void.json `routing.rewrites` `/` ->
// `/en`) and `/en`. Full-bleed: no layout chain.
//
// This ENTRY file owns the island imports. Island hydration (`with { island }`)
// is only wired up for components imported in a `.island.tsx` page/layout entry
// (verified against @void/react's islands plugin), so the two interactive
// islands are declared here and threaded into <HomePage> as elements:
//   • Luge — the desktop-only scroll/reveal engine, hydrated only above 769px
//     (replacing the legacy react-device-detect `isMobile` gate).
//   • TransformImage — the T5 in-browser WASM image demo, hydrated when visible.
// Both still SSR-render (islands execute on the server); they are individually
// SSR-safe (luge defers its browser-only package to a client effect; the demo
// mount-gates and only reads `self.crossOriginIsolated` after mount).
// NOTE: island specifiers MUST be relative paths, not the `@/` alias. Void's
// islands plugin resolves island imports with a plain
// `resolve(importerDir, specifier)` (it does NOT consult the Vite `@/` alias), so
// an aliased specifier fails to resolve, the client manifest key never matches,
// and the island silently never hydrates. Relative paths resolve correctly.
import Luge from '../../components/landing/luge' with {
  island: 'media:(min-width:769px)',
}
import TransformImage from '../../components/transform-image/_Demo' with {
  island: 'idle',
}
// The animated hero flow diagram (Rust → Node.js) + brand-chip logo watermark.
// It only renders/animates after its useEffect runs, so it must hydrate: a plain
// SSR child never hydrates under Void's islands model and stays an empty shell.
import HeroDiagram from '../../components/landing/hero-diagram' with {
  island: 'load',
}
// The site top bar — the SAME navbar the docs chrome uses (logo, section tabs,
// search, GitHub/Discord, language + theme toggles), matching the live napi.rs
// landing. It is an island ('load') and so MUST be imported in this entry file.
import Navbar from '../../components/docs/Navbar' with { island: 'load' }
// The landing has no sidebar, so (like live napi.rs) the theme + language
// toggles live in the footer. Footer is an island here so those toggles hydrate;
// passing `locale` is what makes it render them (the docs layout renders a plain,
// toggle-less Footer instead — those toggles live in the docs sidebar footer).
import Footer from '../../components/docs/Footer' with { island: 'load' }
import { HomePage } from '@/components/landing'
import type { Props } from './index.server'

export default function EnHome({ sponsors }: Props) {
  return (
    <>
      <header className="sticky top-0 z-50">
        <Navbar locale="en" currentPath="/" />
      </header>
      <HomePage
        sponsors={sponsors}
        luge={<Luge />}
        demo={<TransformImage />}
        heroDiagram={<HeroDiagram />}
      />
      <footer className="border-t border-border">
        <Footer locale="en" />
      </footer>
    </>
  )
}
