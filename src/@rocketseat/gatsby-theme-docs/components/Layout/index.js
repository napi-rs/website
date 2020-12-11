/* @jsx jsx */
import { useRef, Fragment, useContext, useCallback } from 'react'
import { jsx, css } from '@emotion/core'
import styled from '@emotion/styled'

import TableOfContents from '@rocketseat/gatsby-theme-docs/src/components/Docs/TOC'
import Header from '@rocketseat/gatsby-theme-docs/src/components/Header'
import Overlay from '@rocketseat/gatsby-theme-docs/src/components/Overlay'
import {
  Main,
  Children,
} from '@rocketseat/gatsby-theme-docs/src/components/Layout/styles'
import Prism from 'prism-react-renderer/prism'

import { SideBarState } from '../Sidebar/sidebar-context'
;(typeof global !== 'undefined' ? global : window).Prism = Prism

require('prismjs/components/prism-rust')
require('prismjs/components/prism-cpp')

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;

  display: grid;
  grid-auto-flow: row;
  grid-gap: 40px;

  @media (max-width: 840px) {
    padding: 24px;
    grid-template-columns: 100%;
  }
`

export default function Layout({
  children,
  disableTableOfContents,
  title,
  headings,
}) {
  const contentRef = useRef(null)
  const { sideBarState, setSideBarState } = useContext(SideBarState)
  const disableTOC =
    disableTableOfContents === true || !headings || headings.length === 0

  const handleMenuOpen = useCallback(() => {
    setSideBarState(!sideBarState)
  }, [setSideBarState, sideBarState])

  return (
    <Fragment>
      <Overlay isMenuOpen={sideBarState} onClick={handleMenuOpen} />
      <Container>
        <Main>
          <Header handleMenuOpen={handleMenuOpen} />
          {title && (
            <h1
              css={css`
                display: none;

                @media (max-width: 1200px) {
                  display: block;
                }
              `}
            >
              {title}
            </h1>
          )}
          <Children ref={contentRef}>
            {title && (
              <h1
                css={css`
                  @media (max-width: 1200px) {
                    display: none;
                  }
                `}
              >
                {title}
              </h1>
            )}
            {children}
          </Children>
          <TableOfContents
            headings={headings}
            disableTOC={disableTOC}
            contentRef={contentRef}
          />
        </Main>
      </Container>
    </Fragment>
  )
}

Layout.defaultProps = {
  disableTableOfContents: false,
  title: '',
  headings: null,
}
