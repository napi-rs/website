import { useRouter } from 'next/router'

const FEEDBACK_LINK_WITH_TRANSLATIONS = {
  'en-US': 'Question? Give us feedback →',
  'zh-CN': '有疑问？给我们反馈 →',
}

export default {
  projectLink: 'https://github.com/napi-rs/napi-rs',
  docsRepositoryBase: 'https://github.com/napi-rs/website/blob/main/pages',
  projectChatLink: 'https://discord.gg/SpWzYHsKHs',
  titleSuffix: ' – NAPI-RS',
  search: true,
  unstable_flexsearch: true,
  floatTOC: true,
  feedbackLink: () => {
    const { locale } = useRouter()
    return (
      FEEDBACK_LINK_WITH_TRANSLATIONS[locale] ||
      FEEDBACK_LINK_WITH_TRANSLATIONS['en-US']
    )
  },
  feedbackLabels: 'feedback',
  logo: () => {
    return (
      <>
        <img src="/img/favicon.png" width={32} />
        <span className="mx-2 font-extrabold hidden md:inline select-none">
          NAPI-RS
        </span>
      </>
    )
  },
  head: ({ title, meta }) => {
    return (
      <>
        {/* Favicons, meta */}
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
            meta.description ||
            'a framework for building pre-compiled Node.js addons in Rust'
          }
        />
      </>
    )
  },
  footerEditLink: ({ locale }) => {
    switch (locale) {
      case 'cn':
        return '在 GitHub 上编辑本页 →'
      default:
        return 'Edit this page on GitHub →'
    }
  },
  footerText: () => {
    return (
      <p>
        Copyright © {new Date().getFullYear()} NAPI-RS. Powered by{' '}
        <a href="https://nextra.vercel.app" target="_blank">
          Nextra
        </a>
        .
      </p>
    )
  },
  i18n: [
    { locale: 'en', text: 'English' },
    { locale: 'cn', text: '简体中文' },
  ],
}
