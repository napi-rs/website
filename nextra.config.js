import { useRouter } from 'next/router'
import Script from 'next/script'

const FEEDBACK_LINK_WITH_TRANSLATIONS = {
  'en-US': 'Question? Give us feedback →',
  'zh-CN': '有疑问？给我们反馈 →',
}

export default {
  docsRepositoryBase: 'https://github.com/napi-rs/website/blob/main',
  chat: {
    link: 'https://discord.gg/SpWzYHsKHs',
  },
  project: {
    link: 'https://github.com/napi-rs/napi-rs',
  },
  logo: () => {
    return (
      <>
        <img src="/img/favicon.png" width={32} />
        <span
          style={{ width: 120 }}
          className="nx-mx-2 nx-font-extrabold nx-md:inline nx-select-none"
        >
          NAPI-RS
        </span>
      </>
    )
  },
  head: (props) => {
    const { title, meta } = props
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
          name="description"
          content={
            meta?.description ||
            'a framework for building pre-compiled Node.js addons in Rust'
          }
        />
        <meta property="og:title" content={title ?? 'NAPI-RS'} />
        <meta
          property="og:image"
          content={`https://${
            process.env.VERCEL_URL && process.env.VERCEL_ENV !== 'production'
              ? process.env.VERCEL_URL
              : 'napi.rs'
          }/img/og.png`}
        />
        <meta
          property="og:description"
          content={
            meta?.description ||
            'NAPI-RS, a framework for building pre-compiled Node.js addons in Rust'
          }
        />
        <meta property="og:url" content="https://napi.rs" />
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
        <p>
          <a href="https://vercel.com?utm_source=napi-rs&utm_campaign=oss">
            <img src="/assets/powered-by-vercel.svg" />
          </a>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Powered by{' '}
          <a
            href="https://nextra.vercel.app"
            className="nx-text-primary-600 nx-underline nx-decoration-from-font [text-underline-position:from-font]"
            target="_blank"
          >
            Nextra
          </a>
        </p>
      )
    },
  },
  editLink: {
    text: () => {
      const { locale } = useRouter()
      switch (locale) {
        case 'cn':
          return '在 GitHub 上编辑本页 →'
        default:
          return 'Edit this page on GitHub →'
      }
    },
  },
  i18n: [
    { locale: 'en', text: 'English' },
    { locale: 'cn', text: '简体中文' },
  ],
}
