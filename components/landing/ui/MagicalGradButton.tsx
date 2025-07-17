import { useRef } from 'react'
import { useMouseHovered } from 'react-use'
import cx from 'classnames'

import { ArrowTopRight } from '../icons'

export function MagicalGradButton({
  children,
  onClick,
  lightBorder,
  Icon = ArrowTopRight
}: {
  children: any
  onClick?: (e: any) => void
  lightBorder?: boolean
  Icon?: any
}) {
  const ref = useRef(null)
  const { docX, docY, posX, posY, elX, elY, elW, elH } = useMouseHovered(
    ref,
    {}
  )
  const { elX: boundElX, elY: boundElY } = useMouseHovered(ref, {
    whenHovered: true,
    bound: true
  })

  const handleButtonClick = (e: any) => {
    if (onClick) onClick(e)
  }

  return (
    <div
      className={cx('MagicalGradButton', { 'LightBorder': lightBorder, 'NoIcon': !Icon })}
      onClick={(e) => handleButtonClick(e)}
      ref={ref}
      style={{
        // @ts-ignore
        '--x': `${elX}px`,
        '--y': `${elY}px`,
        '--bound-x': `${boundElX - elW / 2}px`,
        '--bound-y': `${boundElY - elH / 2}px`,
        '--rotate': `${Math.atan2(
          elX - posY - elH / 2,
          elY - posX - elW / 2
        )}rad`
      }}
    >
      <div className="button-content flex items-center gap-4">
        {children}
        {Icon && <Icon className="button-icon" />}
      </div>
      <div className="button-background">
        <div className="background-blur"></div>
        <div className="background-angular"></div>
      </div>
    </div>
  )
}
