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

      // Setting ticker
      luge.settings({
        ticker: { external: true },
        scroll: {
          disabled: true,
        },
      })
      tick = luge.ticker.tick
      gsap.ticker.add(tick)

      // Force refresh when route change
      luge.lifecycle.refresh()

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
