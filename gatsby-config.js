module.exports = {
  siteMetadata: {
    siteTitle: `napi-rs Docs`,
    defaultTitle: `napi-rs Docs`,
    siteTitleShort: `napi-rs Docs`,
    siteDescription: `A minimal library for building compiled NodeJS add-ons in Rust `,
    siteUrl: `https://napi.rs`,
    siteAuthor: `lynweklm@gmail.com`,
    siteImage: `/banner.png`,
    siteLanguage: `en`,
    themeColor: `#8257E6`,
    basePath: `/`,
  },
  plugins: [
    {
      resolve: `@rocketseat/gatsby-theme-docs`,
      options: {
        configPath: `src/config`,
        docsPath: `src/docs`,
        githubUrl: `https://github.com/napi-rs/website`,
        branch: `main`,
        withMdx: false,
      },
    },
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `NAPI-RS documentations`,
        short_name: `napi-rs`,
        start_url: `/`,
        background_color: `#383e56`,
        display: `standalone`,
        icon: `static/favicon.png`,
      },
    },
    `gatsby-plugin-sitemap`,
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: `G-38WMNQBW8F`,
      },
    },
    `gatsby-plugin-remove-trailing-slashes`,
    {
      resolve: `gatsby-plugin-canonical-urls`,
      options: {
        siteUrl: `https://napi.rs`,
      },
    },
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        extensions: [`.mdx`, `.md`],
        remarkPlugins: [],
        gatsbyRemarkPlugins: [
          `gatsby-remark-autolink-headers`,
          `gatsby-remark-embedder`,
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 960,
              withWebp: true,
              linkImagesToOriginal: false,
            },
          },
          `gatsby-remark-responsive-iframe`,
          `gatsby-remark-copy-linked-files`,
        ],
        plugins: [`gatsby-remark-autolink-headers`, `gatsby-remark-images`],
      },
    },
    `gatsby-plugin-offline`,
  ],
}
