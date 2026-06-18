import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite-plus'
import { voidPlugin } from 'void'
import { voidReact } from '@void/react/plugin'
import { voidMarkdown } from '@void/md/plugin'

// Project root, used to wire the `@/*` -> `./*` path alias (mirrors tsconfig
// compilerOptions.paths) so runtime imports like `@/lib/utils` /
// `@/components/ui/*` resolve under Vite the same way TypeScript resolves them.
const projectRoot = fileURLToPath(new URL('.', import.meta.url))

// Dev/preview cross-origin isolation. The landing page runs the @napi-rs/image
// WASM transcoder, which needs SharedArrayBuffer + threads. `self.crossOriginIsolated`
// (the gate for SAB) is only true when the DOCUMENT carries BOTH
// Cross-Origin-Opener-Policy: same-origin AND Cross-Origin-Embedder-Policy: require-corp.
// The deployed worker sets these per-route via void.json `routing.headers`; `void dev`
// and `vite preview` do NOT replay those, so we stamp them here. Under COEP:require-corp
// the browser also blocks every subresource the isolated page loads (the worker module,
// the nested wasi-worker, the .wasm, images) unless each carries CORP — so we add CORP too.
const DUPLICATED_WASM_PKG =
  '@napi-rs/image-wasm32-wasi/@napi-rs/image-wasm32-wasi/'
function isolationMiddleware(
  req: { url?: string },
  res: { setHeader: (name: string, value: string) => void },
  next: () => void,
) {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
  // @napi-rs/image-wasm32-wasi spawns its own module worker via
  // `new Worker(new URL('@napi-rs/image-wasm32-wasi/wasi-worker-browser.mjs', import.meta.url))`.
  // Under `vite dev` that bare-specifier resolves with the package dir doubled and 404s;
  // collapse it. Production `vite build` bundles the worker, so this is serve-only.
  if (req.url && req.url.includes(DUPLICATED_WASM_PKG)) {
    req.url = req.url.replace(
      DUPLICATED_WASM_PKG,
      '@napi-rs/image-wasm32-wasi/',
    )
  }
  next()
}

// Vitest drives this same config; the Void plugins register a custom "void_worker"
// Vite environment that the vite-plus test runner cannot introspect (ReferenceError:
// module is not defined). Our unit tests are pure-data and need none of the Void
// pipeline, so skip those plugins under Vitest.
const isVitest = !!process.env.VITEST

export default defineConfig({
  // BOTH worker layers (our demo worker + the wasm package's nested wasi-worker) must be
  // ES modules — the wasm browser build is a top-level-await ESM and the default 'iife'
  // worker format cannot handle top-level await, which fails the build.
  worker: { format: 'es' },

  ssr: {
    // `@waaark/luge` reads window/document/requestAnimationFrame at module load,
    // so it crashes if it is evaluated during worker SSR. components/landing/luge.tsx
    // only ever `import()`s it lazily inside a client effect, so it should never be
    // pulled into the SSR graph — but bundle it (don't externalize) so that path is
    // transformed through Vite and any stray CSS side-effects resolve correctly.
    noExternal: ['@waaark/luge'],
  },

  resolve: {
    // The browser build of @napi-rs/image is `@napi-rs/image-wasm32-wasi`. The public
    // wrapper's `main` is the native loader that require()s a platform .node binary, which
    // Vite/rolldown cannot parse. Alias straight to the wasm build everywhere Vite bundles.
    // Array form so the `@/` alias is matched precisely (a bare `@` key would
    // also swallow `@napi-rs/*` etc.). `@/` -> project root mirrors tsconfig
    // `@/*`: `./*`, so runtime imports (`@/lib/utils`, `@/components/ui/*`)
    // resolve under Vite exactly as TypeScript resolves them.
    alias: [
      { find: '@napi-rs/image', replacement: '@napi-rs/image-wasm32-wasi' },
      { find: /^@\//, replacement: `${projectRoot.replace(/\/$/, '')}/` },
    ],
  },

  plugins: isVitest
    ? []
    : [
        {
          name: 'napi-rs-isolation-dev',
          apply: 'serve',
          configureServer(server) {
            server.middlewares.use(isolationMiddleware)
          },
          configurePreviewServer(server) {
            server.middlewares.use(isolationMiddleware)
          },
        },
        voidPlugin(),
        voidReact(),
        // enforce:'pre', auto-detects React → MUST come after voidReact()
        voidMarkdown({
          shiki: {
            langs: [
              'rust',
              'toml',
              'bash',
              'json',
              'js',
              'jsx',
              'ts',
              'tsx',
              'diff',
              'yaml',
            ],
          },
        }),
      ],

  // --- Vitest: use Node pool/environment for lib/nav data-only tests ---
  test: {
    pool: 'forks',
    environment: 'node',
  },

  // --- Vite+ toolchain blocks (consumed by vp fmt / vp lint / vp check / vp staged) ---
  // Mirror the project's previous Prettier config.
  fmt: {
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 80,
    ignorePatterns: [
      'dist/**',
      '.void/**',
      '.wrangler/**',
      'public/**',
      '.yarn/**',
      'legacy_pages/**',
      // @void/md island markdown pages MUST start with their `<script>` island
      // block at byte 0 (the plugin's SCRIPT_RE is anchored, runs before
      // gray-matter), so frontmatter follows the script. Oxfmt assumes
      // frontmatter at byte 0 and rewrites the trailing `---` as a thematic
      // break, corrupting the page. These pages are generated by
      // scripts/convert-content.mjs (the sole formatter of record for them);
      // exempt them from `vp fmt`. Append future inline-island .md pages here.
      'pages/en/docs/concepts/webassembly.md',
      // Blog inline-island pages (byte-0 <script>). announce-v2 (en + cn) imports
      // Diff + Contributors; announce-v3 (en) imports LinkPreview + the SVG-logo
      // components + Sponsor. function-and-callbacks.md has NO island (it stays
      // frontmatter-first) so it is intentionally NOT exempted.
      'pages/en/blog/announce-v2.md',
      'pages/cn/blog/announce-v2.md',
      'pages/en/blog/announce-v3.md',
      // Baked LinkPreview fixture — generated wholesale by
      // scripts/fetch-link-previews.mjs (its formatter of record). Exempt so
      // `vp fmt` doesn't reflow it out of sync with a future rebake.
      'lib/docs/link-preview-data.json',
    ],
  },
  // Oxlint — advisory for now (no type-aware path on this JS-heavy codebase yet).
  lint: {
    ignorePatterns: [
      'dist/**',
      '.void/**',
      '.wrangler/**',
      '.yarn/**',
      'legacy_pages/**',
      'public/**',
    ],
  },
  // Replaces lint-staged. Format-only so it matches the old `prettier --write` behaviour
  // (switch to `vp check --fix` once lint is green).
  staged: {
    '*.{js,jsx,ts,tsx,mjs,cjs}': 'vp fmt --write',
    '*.{json,md,yml,yaml,css}': 'vp fmt --write',
  },
})
