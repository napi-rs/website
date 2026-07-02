import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'

// CSS-only side-effect import — safe at module scope (Vite handles it, no JS
// runs). The @waaark/luge JS itself reads `window` / `document` /
// `requestAnimationFrame` at IMPORT time and crashes the worker SSR, so it is
// loaded lazily inside the effect below (which only runs on the client) rather
// than as a top-level `import luge from '@waaark/luge'`.
import '@waaark/luge/dist/css/luge.css'

function registerLugeReveal(luge: typeof import('@waaark/luge').default) {
  // Heading
  luge.reveal.add('in', 'heading', (element: HTMLDivElement) => {
    const split = new SplitText(element, {
      type: 'lines',
      linesClass: 'line',
    })
    const lines = element.querySelectorAll('.line')
    const tl = gsap.timeline()
    ;(tl.fromTo(
      lines,
      {
        opacity: 0,
        y: 50,
        skewY: 5,
        rotateY: 15,
      },
      {
        opacity: 1,
        y: 0,
        skewY: 0,
        rotateY: 0,
        duration: 1,
        ease: CustomEase.create(
          'custom',
          'M0,0 C0.088,0.638 0.184,0.904 0.374,1.03 0.576,1.164 0.694,1.022 1,1',
        ),
        stagger: 0.07,
      },
    ),
      tl.call(() => {
        split.revert()
      }))
  })

  // Text
  luge.reveal.add('in', 'text', (element: HTMLDivElement) => {
    const tl = gsap.timeline()
    tl.fromTo(
      element,
      {
        opacity: 0,
        y: 30,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: CustomEase.create(
          'custom',
          'M0,0 C0.088,0.638 0.184,0.904 0.374,1.03 0.576,1.164 0.694,1.022 1,1',
        ),
      },
    )
  })
}

export const Luge = () => {
  useEffect(() => {
    let cancelled = false
    let tick: (() => void) | undefined
    // Lazy-import the browser-only @waaark/luge here so the module is never
    // evaluated during SSR.
    import('@waaark/luge').then(({ default: luge }) => {
      if (cancelled) return

      gsap.registerPlugin(ScrollTrigger)
      gsap.registerPlugin(SplitText)
      gsap.registerPlugin(CustomEase)

      // Drive luge's ticker off gsap's RAF loop instead of luge's own internal
      // one. NOTE: luge's Ticker constructor already read `ticker.external`
      // (default `false`) at module-eval time and started its own RAF loop; once
      // we flip it to `true` here that internal loop stops itself after the next
      // frame, so gsap must take over — hence `gsap.ticker.add(tick)` below.
      //
      // We deliberately do NOT set `scroll.disabled` here. luge applies it to its
      // `ScrollAnimation` plugin (slug `scroll`) — the only effect is stamping
      // `lg-scroll-disabled` on <html> (Plugin.beforeInit). This landing uses
      // `data-lg-reveal` + `data-lg-smooth` only (zero `data-lg-scroll`), so the
      // class is dead weight and diverges from the live site, which has no such
      // class.
      luge.settings({
        ticker: { external: true },
      })
      tick = luge.ticker.tick
      gsap.ticker.add(tick)

      // Register reveal animations BEFORE luge's lifecycle reaches its `reveal`
      // step. luge auto-runs a single `load` cycle on import (Core/luge.js:
      // `Ticker.nextTick(() => LifeCycle.cycle('load'))` when the document has
      // already loaded — which is always the case for a dynamically-imported
      // island that mounts after hydration). That `load` cycle ends with the
      // `reveal` event, which sets `Reveal.canReveal = true` and flips in-view
      // `[data-lg-reveal]` elements from `is-out` -> `is-in`.
      //
      // We must NOT call `luge.lifecycle.refresh()` here: `refresh` is a second
      // cycle and `LifeCycle.cycle()` zeroes EVERY event's `done` counter, so
      // starting it concurrently with the still-draining auto `load` cycle
      // corrupts the latter's progress. The `load` cycle then stalls forever at
      // its `['siteLoad', 'pageLoad']` multi-event wait and never reaches
      // `reveal` — leaving `lg-scroll-disabled` stuck and all reveals frozen at
      // `is-out`. The original (static top-level import) never hit this because
      // luge evaluated while `readyState === 'loading'`, so the auto `load` ran
      // cleanly from `DOMContentLoaded` long before this effect's `refresh()`.
      registerLugeReveal(luge)
    })

    return () => {
      cancelled = true
      if (tick) {
        gsap.ticker.remove(tick)
      }
    }
  }, [])

  return <></>
}

export default Luge
