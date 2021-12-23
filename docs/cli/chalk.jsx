import useThemeContext from '@theme/hooks/useThemeContext'
import React from 'react'

export function Green({ children }) {
  const { isDarkTheme } = useThemeContext()
  return (
    <span style={{ color: isDarkTheme ? '#d7ffd9' : '#255d00' }}>
      {children}
    </span>
  )
}

export function Rust({ children }) {
  return <span style={{ color: '#b7410e' }}>{children}</span>
}

export function Warning({ children }) {
  const { isDarkTheme } = useThemeContext()
  return (
    <span style={{ color: isDarkTheme ? '#fbc02d' : '#ff7043' }}>
      {children}
    </span>
  )
}
