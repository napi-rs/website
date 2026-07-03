import type { FeatureCardProps } from './simple-card'
import { useCardAnimation } from '../hooks/useCardAnimation'
// Build-time SVGO (lib/svg/svgo-plugin.ts) — the inner markup of install-flow.svg,
// optimized (65.8 KB → ~29.7 KB) with every animation class + gradient id kept.
import installFlowSvg from './images/install-flow.svg?svgo'

import logoApple from './images/apple.svg'
import logoNode from './images/node-js.svg'
import logoUbuntu from './images/ubuntu.svg'
import logoChrome from './images/chrome.svg'
import logoWA from './images/wa.svg'
import logoLinux from './images/linux.svg'

export function PowerfulCICard({
  title,
  description,
  emoji,
  lugeReveal,
}: FeatureCardProps) {
  const id = 'powerful-ci'

  const { startAnimation, isCardActive } = useCardAnimation(
    `#${id}`,
    undefined,
    {
      once: true,
    },
  )

  const handleMouseOver = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    startAnimation()
  }

  return (
    <div
      className={`feature-card`}
      id={id}
      data-lg-reveal={lugeReveal}
      data-lg-reveal-delay="0.15"
      onMouseOver={handleMouseOver}
    >
      <div className={`feature__visualization ${isCardActive ? 'active' : ''}`}>
        {/* Inner markup is build-time SVGO'd from install-flow.svg and injected
            verbatim — it preserves every CSS-animation class hook (.rect-*,
            .circle-*, .drawLine/.line-*, .check) and gradient id, so the
            on-`.active` CSS animation is unchanged. Kept inline (not <img>)
            because the animation targets these inner nodes. */}
        <svg
          className="install-flow"
          width={369}
          height={183}
          viewBox="0 0 369 183"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          dangerouslySetInnerHTML={{ __html: installFlowSvg }}
        />
        <div className="glow-bg" />
      </div>
      <div className="feature__meta meta--left">
        <h3 className="meta__title">{title}</h3>
        <p className="meta__description">{description}</p>
      </div>
    </div>
  )
}
