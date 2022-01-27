import { locales } from 'nextra/locales'
import { NextResponse } from 'next/server'

export const middleware = (req) => {
  const { nextUrl } = req
  const { locale, defaultLocale } = nextUrl
  if (locale !== defaultLocale) {
    switch (locale) {
      case 'cn':
        return NextResponse.redirect('https://cn.napi.rs')
      case 'en':
      default:
        return NextResponse.redirect('https://napi.rs')
    }
  }
  return locales(req)
}
