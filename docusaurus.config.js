const lightCodeTheme = require('prism-react-renderer/themes/vsLight')
const darkCodeTheme = require('prism-react-renderer/themes/vsDark')

// With JSDoc @type annotations, IDEs can provide config autocompletion
/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: 'NAPI-RS Docs',
  tagline: 'a framework for building pre-compiled Node.js addons in Rust',
  url: 'https://napi.rs',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.png',
  organizationName: 'napi-rs',
  projectName: 'napi-rs',
  plugins: [
    '@docusaurus/plugin-ideal-image',
    [
      '@docusaurus/plugin-content-docs',
      /** @type {import('@docusaurus/preset-classic').Options['docs']} */
      ({
        id: 'changelog',
        path: 'changelog',
        routeBasePath: 'changelog',
        sidebarPath: require.resolve('./changelog-sidebars.js'),
        editUrl: 'https://github.com/napi-rs/website/edit/main/changelog',
      }),
    ],
  ],
  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          id: 'docs',
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/napi-rs/website/edit/main/docs',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/napi-rs/website/edit/main/blog',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
      },
      navbar: {
        title: 'NAPI-RS',
        logo: {
          alt: 'Logo',
          src: 'img/favicon.png',
        },
        items: [
          {
            to: '/docs/introduction/getting-started',
            label: 'Docs',
            position: 'left',
          },
          { to: '/blog', label: 'Blog', position: 'left' },
          { to: '/changelog/napi', label: 'Changelog', position: 'left' },
          {
            href: 'https://github.com/napi-rs/napi-rs',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Tutorial',
                to: '/docs/introduction/getting-started',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Discord',
                href: 'https://discord.gg/SpWzYHsKHs',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/docusaurus',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/napi-rs',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} NAPI-RS. Built with Docusaurus.`,
      },
      prism: {
        additionalLanguages: ['rust', 'cpp'],
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
      gtag: {
        trackingID: 'G-38WMNQBW8F',
      },
    }),
}
