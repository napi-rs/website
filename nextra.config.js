import { useRouter } from 'next/router'
import { useConfig } from 'nextra-theme-docs'
import Script from 'next/script'

const LOADING_LOCALES = {
  en: 'Loading',
  cn: '正在加载',
  'pt-BR': 'Carregando',
}

const PLACEHOLDER_LOCALES = {
  en: 'Search documentation',
  cn: '搜索文档',
  'pt-BR': 'Buscar documentação',
}

const currentYear = new Date().getFullYear()
const Logo = ({ className }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img src="/img/favicon.png" width={32} />
      <span className="text-[16px] text-[var(--foreground)] nx-mx-2 nx-font-extrabold nx-md:inline nx-select-none">
        NAPI-RS
      </span>
    </div>
  )
}

export default {
  docsRepositoryBase: 'https://github.com/napi-rs/website/blob/main',
  chat: {
    link: 'https://discord.gg/SpWzYHsKHs',
  },
  project: {
    link: 'https://github.com/napi-rs/napi-rs',
  },
  logo: Logo,
  head: () => {
    return (
      <>
        {/* Favicons, meta */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@napi_rs" />
        <meta name="twitter:creator" content="@napi_rs" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/img/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/img/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/img/favicon-16x16.png"
        />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Language" content="en" />
        <meta
          name="keywords"
          content="Nodejs, Rust, Node.js, neon, performance, napi-rs, napi"
        />
        <meta
          property="og:image"
          content={`https://${
            process.env.VERCEL_URL && process.env.VERCEL_ENV !== 'production'
              ? process.env.VERCEL_URL
              : 'napi.rs'
          }/img/og-v2.png`}
        />
        <meta property="og:site_name" content="NAPI-RS" />
        <meta property="og:type" content="website" />
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-38WMNQBW8F"
        ></Script>
        <Script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-38WMNQBW8F');`,
          }}
        ></Script>
      </>
    )
  },
  footer: {
    text: () => {
      return (
        <div className="text-[12px] flex flex-wrap justify-between w-full items-center md:gap-3 gap-6 flex-col-reverse md:flex-row">
          <div className="flex flex-col items-center md:items-start md:justify-start justify-center gap-1 flex-shrink-0">
            <Logo className="mb-[5px]"></Logo>
            <p>Released under the MIT License.</p>
            <p>Copyright © {currentYear} NAPI-RS.</p>
          </div>
          <p className="flex flex-wrap gap-2 md:gap-2 md:items-end items-center flex-col">
            <a href="https://vercel.com?utm_source=napi-rs&utm_campaign=oss">
              <img src="/assets/powered-by-vercel.svg" className="!h-8" />
            </a>
            <span>
              Website built with{' '}
              <a
                href="https://nextra.vercel.app"
                className="nx-text-primary-600  nx-decoration-from-font [text-underline-position:from-font]"
                target="_blank"
              >
                Nextra
              </a>
            </span>
            <span className="flex-shrink-0">
              UI inspired by&nbsp;
              <a
                className="!text-[#c063ed] nx-decoration-from-font [text-underline-position:from-font]"
                href="https://vite.dev"
                target="_blank"
              >
                Vite
              </a>
            </span>
          </p>
        </div>
      )
    },
  },
  editLink: {
    text: () => {
      const { locale } = useRouter()
      switch (locale) {
        case 'cn':
          return '在 GitHub 上编辑本页 →'
        case 'pt-BR':
          return 'Editar essa página no Github →'
        default:
          return 'Edit this page on GitHub →'
      }
    },
  },
  search: {
    loading: function useLoading() {
      const { locale, defaultLocale = DEFAULT_LOCALE } = useRouter()
      const text =
        (locale && LOADING_LOCALES[locale]) || LOADING_LOCALES[defaultLocale]
      return <>{text}…</>
    },
    placeholder: function usePlaceholder() {
      const { locale, defaultLocale = DEFAULT_LOCALE } = useRouter()
      const text =
        (locale && PLACEHOLDER_LOCALES[locale]) ||
        PLACEHOLDER_LOCALES[defaultLocale]
      return `${text}…`
    },
  },
  i18n: [
    { locale: 'en', text: 'English' },
    { locale: 'cn', text: '简体中文' },
    { locale: 'pt-BR', text: 'Português do Brasil' },
  ],
  nextThemes: {
    defaultTheme: 'dark',
  },
  useNextSeoProps: () => {
    const { frontMatter, title } = useConfig()
    const { pathname, locale } = useRouter()
    const finalPathname = pathname.split('.')[0]?.replace('/index', '/') || '/'
    const baseUrl = 'https://napi.rs'

    return {
      titleTemplate: '%s \u2013 NAPI-RS',
      openGraph: {
        title: frontMatter.title || title || 'NAPI-RS',
        description:
          frontMatter.description ||
          'NAPI-RS, a framework for building pre-compiled Node.js addons in Rust',
        url: `${baseUrl}/${locale}${finalPathname}`,
      },
    }
  },
}
