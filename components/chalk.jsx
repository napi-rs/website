export function Green({ children }) {
  return (
    <span>
      {children}
      <style jsx>{`
        span {
          color: #255d00;
        }
        :global(.dark) span {
          color: #d7ffd9;
        }
      `}</style>
    </span>
  )
}

export function Rust({ children }) {
  return <span style={{ color: '#b7410e' }}>{children}</span>
}

export function Warning({ children }) {
  return (
    <span>
      {children}
      <style jsx>{`
        span {
          color: #ff7043;
        }
        :global(.dark) span {
          color: #fbc02d;
        }
      `}</style>
    </span>
  )
}
