import { NextResponse } from 'next/server'
import { locales } from 'nextra/locales'

export const middleware = (req) => {
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
