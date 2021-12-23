import React from 'react'

export function Green({ children }) {
  return <span style={{ color: '#00e676' }}>{children}</span>
}

export function Rust({ children }) {
  return <span style={{ color: '#b7410e' }}>{children}</span>
}

export function Warning({ children }) {
  return <span style={{ color: '#fbc02d' }}>{children}</span>
}
