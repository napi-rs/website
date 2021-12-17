/**@jsx jsx */

import { css, jsx } from '@emotion/react'

import GuideVideoURL from './napi-rs-guide.mp4'

export const GuideVideo = () => {
  return (
    <video controls css={css({ width: '100%' })}>
      <source src={GuideVideoURL} type="video/mp4" />
      <track kind="captions" srcLang="en" />
    </video>
  )
}
