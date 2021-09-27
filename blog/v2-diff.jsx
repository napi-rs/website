import useThemeContext from '@theme/hooks/useThemeContext'
import React from 'react'

const TYPE_COLOR_MAP = {
  dark: {
    plus: 'rgb(181, 206, 168)',
    minus: 'rgb(206, 145, 120)',
  },
  light: {
    plus: 'rgb(9, 134, 88)',
    minus: 'rgb(163, 21, 21)',
  },
}

const DiffWord = ({ children, type }) => {
  const { isDarkTheme } = useThemeContext()

  return (
    <span
      style={{ color: TYPE_COLOR_MAP[isDarkTheme ? 'dark' : 'light'][type] }}
    >
      {children}
    </span>
  )
}

export const Diff = () => (
  <pre>
    <code>
      <span>
        <DiffWord type="minus">-</DiffWord> A{' '}
        <DiffWord type="minus">minimal library</DiffWord> for building compiled
        Node.js add-ons in Rust via Node-API
      </span>
      <br />
      <span>
        <DiffWord type="plus">+</DiffWord> A{' '}
        <DiffWord type="plus">framework</DiffWord> for building compiled Node.js
        add-ons in Rust via Node-API
      </span>
    </code>
  </pre>
)
