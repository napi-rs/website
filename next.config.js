import { PerfseePlugin } from '@perfsee/webpack'
import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './nextra.config.js',
  flexsearch: true,
  staticImage: true,
})

const nextConfig = withNextra({
  i18n: {
    defaultLocale: process.env.LOCALE || 'en',
    locales: ['en', 'cn', 'pt-BR'],
  },
  transpilePackages: ['gsap'],
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

export default nextConfig
