import React from 'react';

import LogoWithText from './logo-with-text.png'

export default function Logo(props) {
  return <img src={LogoWithText} alt="napi-rs logo" {...props} />
}
