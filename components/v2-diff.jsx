const DiffWord = ({ children, type }) => {
  return <span className={`diff-word ${type}`}>{children}</span>
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

export default Diff
