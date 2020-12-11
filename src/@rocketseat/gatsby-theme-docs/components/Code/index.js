import React, { useState } from 'react'
import Highlight, { defaultProps } from 'prism-react-renderer'
import rangeParser from 'parse-numeric-range'
import theme from 'prism-react-renderer/themes/dracula'
import { LiveProvider, LiveEditor } from 'react-live'
import { copyToClipboard } from '@rocketseat/gatsby-theme-docs/src/util/copy-to-clipboard'
import scope from '@rocketseat/gatsby-theme-docs/src/components/Code/LiveCodeScope'
import {
  CopyCode,
  LineNo,
  Pre,
  PreHeader,
  LiveWrapper,
  LivePreview,
  LiveError,
  StyledEditor,
} from './styles'

const calculateLinesToHighlight = (meta) => {
  const RE = /{([\d,-]+)}/

  if (RE.test(meta)) {
    const strlineNumbers = RE.exec(meta)[1]
    const lineNumbers = rangeParser(strlineNumbers)
    return (index) => lineNumbers.includes(index + 1)
  }

  return () => false
}

export default function CodeHighlight({
  codeString,
  className,
  live,
  highlight,
  title,
  lineNumbers,
}) {
  const [copied, setCopied] = useState(false)
  const language = className && className.replace(/language-/, '')

  const highlightLang = language === 'gyp' ? 'json' : language
  const shouldHighlightLine = calculateLinesToHighlight(highlight)

  const handleClick = () => {
    setCopied(true)
    copyToClipboard(codeString)

    setTimeout(() => {
      setCopied(false)
    }, 4000)
  }

  if (live) {
    return (
      <LiveProvider
        code={codeString}
        noInline
        theme={theme}
        transformCode={(code) => `/** @jsx mdx */${code}`}
        scope={scope}
      >
        <LiveWrapper>
          <LivePreview />

          <StyledEditor>
            <CopyCode onClick={handleClick} disabled={copied} hasTitle>
              {copied ? 'Copied!' : 'Copy'}
            </CopyCode>

            <LiveEditor />
          </StyledEditor>

          <LiveError />
        </LiveWrapper>
      </LiveProvider>
    )
  }

  return (
    <>
      {title && <PreHeader>{title}</PreHeader>}
      <div className={`gatsby-highlight gatsby-highlight-${language}`}>
        <Highlight
          {...defaultProps}
          code={codeString}
          language={highlightLang}
          theme={theme}
        >
          {({
            className: blockClassName,
            style,
            tokens,
            getLineProps,
            getTokenProps,
          }) => (
            <Pre
              className={blockClassName}
              style={style}
              hasTitle={title}
              hasLanguage={!!language}
            >
              <CopyCode
                onClick={handleClick}
                disabled={copied}
                hasTitle={title}
              >
                {copied ? 'Copied!' : 'Copy'}
              </CopyCode>
              <code>
                {tokens.map((line, index) => {
                  const lineProps = getLineProps({ line, key: index })

                  if (shouldHighlightLine(index)) {
                    lineProps.className = `${lineProps.className} highlight-line`
                  }

                  return (
                    <div {...lineProps}>
                      {lineNumbers && <LineNo>{index + 1}</LineNo>}
                      {line.map((token, key) => (
                        <span {...getTokenProps({ token, key })} />
                      ))}
                    </div>
                  )
                })}
              </code>
            </Pre>
          )}
        </Highlight>
      </div>
    </>
  )
}

CodeHighlight.defaultProps = {
  live: false,
  title: null,
  lineNumbers: null,
  highlight: null,
}
