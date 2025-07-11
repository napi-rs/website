import cx from 'classnames'

export function SectionTitle({
  children,
  className,
}: {
  children: any
  className?: string
}) {
  return (
    <div className={cx('section-title', className)}>
      {children}
      <div className="section-title blur-effect">{children}</div>
    </div>
  )
}
