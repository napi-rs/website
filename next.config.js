import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PerfseePlugin } from '@perfsee/webpack'
import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './nextra.config.js',
  search: true,
  staticImage: true,
})

export default withNextra({
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt-BR'],
  },
  webpack(
    /** @type {import('webpack').Configuration} */ config,
    { dev, isServer },
  ) {
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

    config.resolve.alias['@'] = join(fileURLToPath(import.meta.url), '..')
    return config
  },
})
