/// <reference types="vite/client" />

// Standard Vite ambient types. Provides `import.meta.env` (PROD / DEV / MODE,
// used by the changelog loader's prod-vs-dev failure handling), `import.meta.glob`,
// and asset-import module declarations (`*.svg`, `*.png`, `*.mp4`, …) that Vite
// resolves to URL strings. The `types: ["void/env"]` setting in tsconfig.json
// only governs automatic @types inclusion — this explicit reference is honored
// regardless, so it does not need to be added to that list.
