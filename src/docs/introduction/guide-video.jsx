import { css } from '@emotion/core'
import React from 'react'

import GuideVideoURL from './napi-rs-guide.mp4'

export const GuideVideo = () => {
  return (
    <video controls css={css({ maxWidth: '100%' })}>
      <source src={GuideVideoURL} type="video/mp4" />
      <track kind="captions" srcLang="en" />
    </video>
  )
}
