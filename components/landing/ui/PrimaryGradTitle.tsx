export function PrimaryGradTitle({ children }: { children: any }) {
  return (
    <div className="PrimaryGradTitle">
      <div className="title-content layer-front">{children}</div>
      <div className="title-content layer-blur">{children}</div>
    </div>
  )
}
