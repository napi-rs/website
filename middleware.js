import { NextResponse } from 'next/server'
import { locales } from 'nextra/locales'

const DEFAULT_LOCALE = 'en'

export const middleware = (req) => {
  const { pathname } = req.nextUrl

  // Handle .md suffix requests for raw markdown access (AI-friendly)
  // Must be checked BEFORE Nextra's locale handling
  if (pathname.endsWith('.md')) {
    // Remove .md extension
    const cleanPath = pathname.slice(0, -3)

    // Get locale from Next.js i18n (it strips locale from pathname)
    const locale = req.nextUrl.locale || DEFAULT_LOCALE

    // Rewrite to API route - pass locale via header
    const apiUrl = new URL(`/api/raw${cleanPath}`, req.url)
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-raw-md-locale', locale)

    return NextResponse.rewrite(apiUrl, {
      request: {
        headers: requestHeaders,
      },
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    })
  }

  const res = locales(req)
  if (res) {
    res.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    return res
  } else {
    return NextResponse.next({
      request: {
        headers: req.headers,
      },
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    })
  }
}
