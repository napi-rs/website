export default function NodeLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="node-link nx-text-primary-600 nx-underline nx-decoration-from-font [text-underline-position:from-font]"
    >
      {children}
    </a>
  )
}
