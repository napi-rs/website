import React from 'react'
import { preToCodeBlock } from 'mdx-utils'
import { MDXProvider } from '@mdx-js/react'
import { MDXScopeProvider } from 'gatsby-plugin-mdx/context'
import scopeContexts from 'gatsby-plugin-mdx/loaders/mdx-scopes'

import Code from '../@rocketseat/gatsby-theme-docs/components/Code'

const components = {
  pre: (preProps) => {
    const props = preToCodeBlock(preProps)

    if (props) {
      return <Code {...props} />
    }

    return <pre {...preProps} />
  },
  inlineCode: (props) => <code className="inline-code" {...props} />,
  table: ({ children, ...rest }) => (
    <div style={{ overflowX: `auto` }}>
      <table {...rest}>{children}</table>
    </div>
  ),
}

export function wrapPageElement({ element }) {
  return (
    <MDXScopeProvider __mdxScope={scopeContexts}>
      <MDXProvider components={components}>{element}</MDXProvider>
    </MDXScopeProvider>
  )
}
