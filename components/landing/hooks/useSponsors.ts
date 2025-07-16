import { useEffect, useState, useRef } from 'react'

interface Sponsors {
  special: Sponsor[]
  platinum: Sponsor[]
  platinum_china: Sponsor[]
  gold: Sponsor[]
  silver: Sponsor[]
  bronze: Sponsor[]
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
  const [data, setData] = useState<
    { tier: string; size: string; items: Sponsor[] }[] | undefined
  >()
  const observerRef = useRef<MutationObserver | null>(null)
  const isMountedRef = useRef(true)

  // 监听暗色模式变化
  useEffect(() => {
    const ob = new MutationObserver((list) => {
      for (const m of list) {
        if (m.attributeName === 'class') {
          if (data) {
            const newData = JSON.parse(JSON.stringify(data))
            newData.forEach(({ items }) => toggleDarkLogos(items))
            setData(newData)
          }
        }
      }
    })

    ob.observe(document.documentElement, { attributes: true })
    observerRef.current = ob

    return () => {
      ob.disconnect()
      observerRef.current = null
      isMountedRef.current = false
    }
  }, [data])

  // 获取赞助数据
  useEffect(() => {
    // 如果已有数据则直接使用
    if (data) return

    const mappedData = mapSponsors(sponsors)
    // 处理暗色模式
    mappedData.forEach(({ items }) => toggleDarkLogos(items))

    setData(mappedData)
  }, [data])

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
