import { createCssVariablesTheme } from 'shiki'

// Light-mode code theme for docs (@void/md, vite.config.ts) AND the changelog
// (lib/changelog/render.ts), so both render identically.
//
// napi.rs / Nextra highlight code with Shiki's `css-variables` theme in BOTH
// modes — its signature GREEN string literals persist in light mode (github's
// light theme, which we used before, renders strings BLUE and keywords a duller
// red). This is the LIGHT half of the dual-theme output: every token emits
// `color:var(--shiki-light-token-…)`, resolved against the light hexes defined
// in pages/theme.css (`.void-md`). It mirrors the dark half (shikiDarkCssVars,
// `--shiki-` prefix) so light and dark share one mechanism. The `--shiki-light-`
// prefix keeps the two halves' variables distinct in the same span
// (`color:var(--shiki-light-*)` for light; `--shiki-dark:var(--shiki-*)` swapped
// in by code.css for dark).
export const shikiLightCssVars = createCssVariablesTheme({
  name: 'css-variables-light',
  variablePrefix: '--shiki-light-',
  fontStyle: true,
})
