const toRem = (val) => {
  return val / 16
}

// @REF: https://min-max-calculator.9elements.com
// @TODO: Support negative value
export const fluidValue = (
  min = 16,
  max = 24,
  minWidth = 390,
  maxWidth = 1440,
  unit = 'px',
) => {
  if (min > max) {
    // max = min
  }

  if (unit == 'px') {
    min = toRem(min)
    max = toRem(max)
    minWidth = toRem(minWidth)
    maxWidth = toRem(maxWidth)
  }

  const variablePart = (max - min) / (maxWidth - minWidth)
  const constant = parseFloat((max - maxWidth * variablePart).toFixed(3))
  const result = `clamp(${min}rem, ${constant}rem + ${parseFloat((100 * variablePart).toFixed(2))}vw, ${max}rem)`

  return result
}

const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    'postcss-functions': {
      functions: { fluidValue, 'fluid-value': fluidValue, fv: fluidValue },
    },
    'postcss-import': {},
  },
}
export default config
