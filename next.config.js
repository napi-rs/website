const { PerfseePlugin } = require('@perfsee/webpack')
const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './nextra.config.js',
  flexsearch: true,
  staticImage: true,
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
      config.devtool = 'hidden-nosources-source-map'
      if (Array.isArray(config.plugins)) {
        config.plugins.push(plugin)
      } else {
        config.plugins = [plugin]
      }
    }
    config.module.rules.push({
      test: /\.mp4$/,
      loader: 'file-loader',
      options: {
        name: '[name]-[contenthash:8].[ext]',
        publicPath: `/_next/static/videos/`,
        outputPath: `${isServer ? '../' : ''}static/videos/`,
      },
    })
    return config
  },
})
