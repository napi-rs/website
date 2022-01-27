const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './nextra.config.js',
  unstable_contentDump: true,
  unstable_staticImage: true,
})

module.exports = withNextra({
  i18n: {
    locales: ['en', 'cn'],
    defaultLocale: process.env.LOCALE || 'en',
  },
})
