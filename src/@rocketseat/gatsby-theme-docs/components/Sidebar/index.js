import React, { memo } from 'react'
import { useStaticQuery, graphql, Link } from 'gatsby'
import { useSidebar } from '@rocketseat/gatsby-theme-docs-core'

import { isExternalUrl } from '@rocketseat/gatsby-theme-docs/src/util/url'
import ExternalLink from '@rocketseat/gatsby-theme-docs/src/components/Sidebar/ExternalLink'
import InternalLink from '@rocketseat/gatsby-theme-docs/src/components/Sidebar/InternalLink'
import Logo from '@rocketseat/gatsby-theme-docs/src/components/Logo'

import {
  NavContainer,
  LogoContainer,
  List,
  Heading,
  Item,
  SubItem,
} from './styles'

function ListWithSubItems({ children, text }) {
  return (
    <>
      <Heading>{text}</Heading>
      <SubItem>{children}</SubItem>
    </>
  )
}

const Sidebar = memo(function SidebarComponent() {
  const {
    site: {
      siteMetadata: { basePath },
    },
  } = useStaticQuery(graphql`
    {
      site {
        siteMetadata {
          basePath
        }
      }
    }
  `)

  const data = useSidebar()

  return (
    <NavContainer isMenuOpen={false}>
      <LogoContainer>
        <Link to={basePath} aria-label="Go to home page">
          <Logo aria-hidden="true" />
        </Link>
      </LogoContainer>
      <nav>
        <List>
          {data.map(({ node: { label, link, items, id } }) => {
            if (Array.isArray(items)) {
              const subitems = items.map((item) => {
                return (
                  <Item key={item.link}>
                    {isExternalUrl(item.link) ? (
                      <ExternalLink link={item.link} label={item.label} />
                    ) : (
                      <InternalLink link={item.link} label={item.label} />
                    )}
                  </Item>
                )
              })

              return (
                <ListWithSubItems key={id} text={label}>
                  {subitems}
                </ListWithSubItems>
              )
            }

            return (
              <Item key={id}>
                {isExternalUrl(link) ? (
                  <ExternalLink link={link} label={label} />
                ) : (
                  <InternalLink link={link} label={label} />
                )}
              </Item>
            )
          })}
        </List>
      </nav>
    </NavContainer>
  )
})

export default Sidebar
