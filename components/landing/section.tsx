import cx from 'classnames'

export function SectionTitle({
  children,
  className,
}: {
  children: any
  className?: string
}) {
  return (
    <div className={cx('section-title', className)} data-lg-reveal="heading">
      {children}
      <div className="section-title blur-effect">{children}</div>
    </div>
  )
}

export function SectionDesc({
  children,
  className,
}: {
  children: any
  className?: string
}) {
  return (
    <div className={cx('section-desc', className)} data-lg-reveal="text">
      {children}
    </div>
  )
}
