import { useEffect, useState, useRef } from 'react'

// Tier keys match the washed `sponsor.json` payload (lib/landing/sponsors.ts):
// specialThanks / platinum / gold / sliver / backers. The `sliver` misspelling
// is intentional and load-bearing — `mapSponsors` reads `sponsors['sliver']`.
interface Sponsors {
  specialThanks: Sponsor[]
  platinum: Sponsor[]
  gold: Sponsor[]
  sliver: Sponsor[]
  backers: Sponsor[]
}

interface Sponsor {
  name: string
  img: string
  url: string
  /**
   * Expects to also have an **inversed** image with `-dark` postfix.
   */
  hasDark?: true
}

function toggleDarkLogos(items: Sponsor[] | undefined) {
  if (!items) return

  const isDark = document.documentElement.classList.contains('dark')
  items.forEach((s: Sponsor) => {
    if (s.hasDark) {
      s.img = isDark
        ? s.img.replace(/(\.\w+)$/, '-dark$1')
        : s.img.replace(/-dark(\.\w+)$/, '$1')
    }
  })
}

export function useSponsor(sponsors: Sponsors) {
  // Map the washed sponsor payload synchronously during render so the tiers are
  // present in the SSR HTML (and on static, never-hydrated island pages like
  // /cn and /pt-BR). `mapSponsors` is pure and touches no browser globals, so it
  // is SSR-safe; the dark-logo swap (which reads `document`) stays in the
  // client-only effect below.
  const [data, setData] = useState<
    { tier: string; size: string; items: Sponsor[] }[]
  >(() => mapSponsors(sponsors))
  const observerRef = useRef<MutationObserver | null>(null)

  // Apply the dark-logo variants on mount and re-apply whenever the root
  // `class` toggles (light/dark). Effect-only, so it never runs during SSR.
  useEffect(() => {
    const applyDarkLogos = () => {
      setData((prev) => {
        const next = JSON.parse(JSON.stringify(prev))
        next.forEach(({ items }) => toggleDarkLogos(items))
        return next
      })
    }

    // Initial swap once on the client (the SSR render used the light variants).
    applyDarkLogos()

    const ob = new MutationObserver((list) => {
      for (const m of list) {
        if (m.attributeName === 'class') {
          applyDarkLogos()
        }
      }
    })

    ob.observe(document.documentElement, { attributes: true })
    observerRef.current = ob

    return () => {
      ob.disconnect()
      observerRef.current = null
    }
  }, [])

  return {
    data,
  }
}

function mapSponsors(sponsors: Sponsors) {
  return [
    {
      tier: 'Special Thanks',
      size: 'big',
      items: sponsors['specialThanks'],
    },
    {
      tier: 'Platinum Sponsors',
      size: 'big',
      items: sponsors['platinum'],
    },
    {
      tier: 'Gold Sponsors',
      size: 'medium',
      items: [...sponsors['gold']],
    },
    {
      tier: 'Sliver Sponsors',
      size: 'small',
      items: [...sponsors['sliver']],
    },
    {
      tier: 'Backers',
      size: 'big',
      items: [...sponsors['backers']],
    },
  ]
}
