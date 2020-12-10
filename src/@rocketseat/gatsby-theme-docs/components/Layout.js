import React from 'react'
import { css, Global } from '@emotion/core'

import Layout from '@rocketseat/gatsby-theme-docs/src/components/Layout'

import Prism from 'prism-react-renderer/prism'
;(typeof global !== 'undefined' ? global : window).Prism = Prism

require('prismjs/components/prism-rust')
require('prismjs/components/prism-cpp')

export default function Homepage(props) {
  return (
    <>
      <Global
        styles={css({
          [`.prism-code.language-cpp::before`]: {
            content: '"c++"',
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
      <Layout {...props} />
    </>
  )
}
