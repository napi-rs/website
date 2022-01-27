import React from 'react'

const DiffWord = ({ children, type }) => {
  return (
    <span className={type}>
      {children}
      <style jsx>{`
        :global(.dark) span.plus {
          color: rgb(181, 206, 168);
        }
        :global(.dark) span.minus {
          color: rgb(206, 145, 120);
        }
        span.plus {
          color: rgb(9, 134, 88);
        }
        span.minus {
          color: rgb(163, 21, 21);
        }
      `}</style>
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
