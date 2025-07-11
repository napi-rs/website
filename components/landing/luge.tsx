'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { CustomEase } from 'gsap/CustomEase'

import luge from '@waaark/luge'
import '@waaark/luge/dist/css/luge.css'

function registerLugeReveal() {
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
    gsap.registerPlugin(ScrollTrigger)
    gsap.registerPlugin(SplitText)
    gsap.registerPlugin(ScrollSmoother)

    ScrollSmoother.create({
      smooth: 1,
      effects: true,
    })

    registerLugeReveal()
  }, [])

  console.log('luge', luge)
}

export default Luge
