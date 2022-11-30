const { PerfseePlugin } = require('@perfsee/webpack')
const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './nextra.config.js',
  unstable_flexsearch: true,
  unstable_staticImage: true,
})

module.exports = withNextra({
  i18n: {
    defaultLocale: process.env.LOCALE || 'en',
    locales: ['en', 'cn'],
  },
  webpack(config, { dev, isServer }) {
    if (!dev && !isServer) {
      const plugin = new PerfseePlugin({
        project: 'napi-rs-website',
        artifactName: 'main',
      })
      if (Array.isArray(config.plugins)) {
        config.plugins.push(plugin)
      } else {
        config.plugins = [plugin]
      }
    }
    return config
  },
})
