/**@jsx jsx */
import React from 'react'
import { jsx, css, Global, ThemeProvider, useTheme } from '@emotion/react'
import styled from '@emotion/styled'
import { useState } from 'react'

import Sidebar from '../@rocketseat/gatsby-theme-docs/components/Sidebar'
import { SideBarState } from '../@rocketseat/gatsby-theme-docs/components/Sidebar/sidebar-context'

const theme = {
  colors: {
    primary: '#fdcfdf',
    background: '#383e56',
    shape: `#222831`,
    title: `#eedad1`,
    text: `#f8f1f1`,
    link: `#69a8ee`,
  },
}

const globalStyles = (theme) => css`
  *,
  *::after,
  *::before {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-size: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background-color: ${theme.colors.background};
    text-rendering: optimizelegibility;
    -webkit-font-smoothing: antialiased;
    overflow-y: scroll;
  }

  h1 {
    font-size: 32px;
    color: ${theme.colors.title};
    font-weight: bold;
    margin-bottom: 24px;
  }

  h2 {
    font-size: 24px;
  }

  h3 {
    font-size: 18px;
  }

  h4 {
    font-size: 16px;
  }

  h2,
  h3,
  h4,
  h5,
  h6 {
    color: ${theme.colors.title};

    margin: 24px 0 16px 0;
    font-weight: bold;
  }

  p {
    color: ${theme.colors.text};
    font-size: 16px;
    line-height: 28px;
    margin-bottom: 16px;
    font-weight: 400;
  }

  code.inline-code {
    display: inline-block;
    vertical-align: middle;
    line-height: 1;
    padding: 0.2em;
    background-color: #44475a;
    color: rgba(248, 248, 242);
    font-size: 14px;
    border-radius: 3px;
    font-feature-settings: 'clig' 0, 'calt' 0;
    font-variant: no-common-ligatures no-discretionary-ligatures
      no-historical-ligatures no-contextual;
  }

  h1 code.inline-code,
  h2 code.inline-code {
    font-size: calc(100% - 5px);
    padding: 4px;
  }

  a {
    color: ${theme.colors.link};
    font-weight: bold;
    text-decoration: none;
    word-break: break-word;

    &:hover {
      text-decoration: underline;
    }
  }

  blockquote {
    margin-bottom: 16px;
    width: 100%;

    p {
      padding: 1rem;
      border-radius: 5px;
      background: ${theme.colors.shape};
      color: ${theme.colors.text};
      margin: 0;
    }
  }

  hr {
    border: 0;
    height: 0;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  }

  table {
    border-collapse: separate;
    border-spacing: 0 4px;
    margin-top: -4px;
    margin-bottom: 16px;
    width: 100%;

    th,
    td {
      margin: 0;
      color: ${theme.colors.text};
      background-color: ${theme.colors.shape};
      border: solid 1px ${theme.colors.shape};
      border-style: solid none;
      padding: 12px;

      :first-of-type {
        border-left-style: solid;
        border-top-left-radius: 5px;
        border-bottom-left-radius: 5px;
      }

      :last-child {
        border-right-style: solid;
        border-bottom-right-radius: 5px;
        border-top-right-radius: 5px;
      }
    }

    tr {
      th {
        color: ${theme.colors.title};
        text-align: left;
        font-weight: bold;
      }
    }
  }

  iframe {
    margin-bottom: 16px;
  }

  img {
    max-width: 100%;
  }

  ul,
  ol {
    color: ${theme.colors.text};
    padding-left: 15px;
    margin-bottom: 16px;

    li {
      line-height: 28px;
    }
  }

  li ul,
  li ol {
    margin-bottom: 0;
  }

  .gatsby-highlight {
    font-family: Hack, SFMono-Regular, Menlo, Monaco, Consolas,
      'Liberation Mono', 'Courier New', monospace;
    font-variant: no-common-ligatures no-discretionary-ligatures
      no-historical-ligatures no-contextual;

    position: relative;
    z-index: 0;
    margin: 0 0 16px 0;
    overflow: auto;
    font-size: 14px !important;
    -webkit-text-size-adjust: none;

    .token {
      font-style: normal !important;
    }
  }

  pre[class*='language-']::before {
    background: #d9d7e0;
    border-radius: 0 0 4px 4px;
    color: #232129;
    font-size: 12px;
    letter-spacing: 0.075em;
    line-height: 1;
    padding: 0.25rem 0.5rem;
    position: absolute;
    left: 1rem;
    text-align: right;
    text-transform: uppercase;
    top: 0;
  }

  pre[class~='language-js']::before,
  pre[class~='language-javascript']::before {
    content: 'js';
    background: #f7df1e;
  }

  pre[class~='language-jsx']::before {
    content: 'jsx';
    background: #61dafb;
  }

  pre[class~='language-typescript']::before,
  pre[class~='language-ts']::before {
    content: 'ts';
    background: #294e80;
    color: #fff;
  }

  pre[class~='language-tsx']::before {
    content: 'tsx';
    background: #294e80;
    color: #fff;
  }

  pre[class~='language-graphql']::before {
    content: 'GraphQL';
    background: #e10098;
    color: #fff;
  }

  pre[class~='language-html']::before {
    content: 'html';
    background: #005a9c;
    color: #fff;
  }

  pre[class~='language-css']::before {
    content: 'css';
    background: #ff9800;
    color: #fff;
  }

  pre[class~='language-mdx']::before {
    content: 'mdx';
    background: #f9ac00;
    color: #fff;
  }

  pre[class~='language-shell']::before {
    content: 'shell';
  }

  pre[class~='language-sh']::before {
    content: 'sh';
  }

  pre[class~='language-bash']::before {
    content: 'bash';
  }

  pre[class~='language-yaml']::before,
  pre[class~='language-yml']::before {
    content: 'yaml';
    background: #ffa8df;
  }

  pre[class~='language-toml']::before {
    content: 'toml';
    background: white;
  }

  pre[class~='language-markdown']::before {
    content: 'md';
  }

  pre[class~='language-json']::before,
  pre[class~='language-json5']::before {
    content: 'json';
    background: linen;
  }

  pre[class~='language-diff']::before {
    content: 'diff';
    background: #e6ffed;
  }

  pre[class~='language-text']::before {
    content: 'text';
    background: #fff;
  }

  pre[class~='language-flow']::before {
    content: 'flow';
    background: #e8bd36;
  }

  #gatsby-focus-wrapper {
    @media (max-width: 840px) {
      width: 100%;
    }
    width: calc(100% - 320px);
  }
`

const Wrapper = styled.div(({ theme: { colors } }) => ({
  display: 'flex',
  background: colors.background,
}))

function GlobalStyle() {
  const theme = useTheme()
  return (
    <Global
      styles={css(globalStyles(theme), {
        [`.prism-code.language-cpp`]: {
          '&::before': {
            content: '"c++"',
          },
        },
        [`.prism-code.language-rust::before`]: {
          content: '"rust"',
          background: '#b7410e',
          color: '#fff',
        },
        [`.gatsby-highlight.gatsby-highlight-gyp`]: {
          '.prism-code.language-json::before': {
            content: '"gyp"',
            background: '#a2fca2',
            color: '#000',
          },
        },
        [`code.inline-code`]: {
          verticalAlign: 'unset',
          color: '#fdcfdf',
        },
      })}
    />
  )
}

function Root({ children }) {
  const [sideBarState, setSideBarState] = useState(false)

  return (
    <Wrapper>
      <SideBarState.Provider value={{ sideBarState, setSideBarState }}>
        <Sidebar />
        {children}
      </SideBarState.Provider>
    </Wrapper>
  )
}

export function wrapRootElement({ element }) {
  // destructor the root.js element param from `@rocketseat/gatsby-theme-docs`
  const [, rawElement] = element.props.children.props.children.props.children
  return (
    <ThemeProvider theme={theme}>
      <>
        <GlobalStyle />
        <Root>{rawElement}</Root>
      </>
    </ThemeProvider>
  )
}
