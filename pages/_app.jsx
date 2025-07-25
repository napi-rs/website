import { Analytics } from '@vercel/analytics/react'

import '../style.css'
import '@/components/landing/style.css'

export default function Nextra(props) {
  const { Component, pageProps } = props
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout || ((page) => page)

  const layout = getLayout(<Component data-lg-smooth {...pageProps} />)
  return (
    <>
      <Analytics />
      {layout}
    </>
  )
}
