/// <reference types="vite/client" />

// Standard Vite ambient types. Provides `import.meta.env` (PROD / DEV / MODE),
// `import.meta.glob`, and asset-import module declarations (`*.svg`, `*.png`,
// `*.mp4`, …) that Vite resolves to URL strings. The `types: ["void/env"]`
// setting in tsconfig.json only governs automatic @types inclusion — this
// explicit reference is honored regardless, so it does not need to be added to
// that list.

// Changelog data virtual modules — the default export is one package's full
// release history rendered to HTML at build time (lib/changelog/plugin.ts).
declare module 'virtual:changelog/*' {
  const html: string
  export default html
}

// `import inner from './x.svg?svgo'` → SVGO-optimized INNER markup (root <svg>
// stripped) as a string, for inlining via dangerouslySetInnerHTML. See
// lib/svg/svgo-plugin.ts.
declare module '*.svg?svgo' {
  const inner: string
  export default inner
}
