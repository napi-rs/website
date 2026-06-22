import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCssVariablesTheme } from 'shiki'
import { defineConfig } from 'vite-plus'
import { voidPlugin } from 'void'
import { voidReact } from '@void/react/plugin'
import { voidMarkdown } from '@void/md/plugin'
import { changelogData } from './lib/changelog/plugin.ts'
import { convertFenceHighlightMeta } from './lib/md/fence-highlight.ts'
import { markCodeFilenames } from './lib/md/code-filename.ts'
import { sitemapPlugin } from './scripts/generate-sitemap.mjs'
import { generateRss } from './scripts/generate-rss.mjs'

// Docs dark code theme. napi.rs / Nextra highlight code with Shiki's
// `css-variables` theme (signature: GREEN string literals #4bb74a), NOT
// github-dark (which renders strings BLUE). @void/md passes `shiki.themes`
// straight to createHighlighter/codeToHtml, both of which accept a theme
// OBJECT, so this css-variables theme becomes the dark half of the dual-theme
// output: every token emits `--shiki-dark:var(--shiki-token-…)`, and code.css's
// dark swap (`color:var(--shiki-dark)`) resolves them against the --shiki-token-*
// hexes defined in pages/theme.css. Light keeps github-light. Mirrors the
// landing demo panel (scripts/build-demo-code.mjs + components/landing/live-demo.css).
const shikiDarkCssVars = createCssVariablesTheme({
  name: 'css-variables',
  variablePrefix: '--shiki-',
  fontStyle: true,
})

// Project root, used to wire the `@/*` -> `./*` path alias (mirrors tsconfig
// compilerOptions.paths) so runtime imports like `@/lib/utils` /
// `@/components/ui/*` resolve under Vite the same way TypeScript resolves them.
const projectRoot = fileURLToPath(new URL('.', import.meta.url))

// Dev/preview cross-origin isolation. Three pages run the @napi-rs/image WASM
// transcoder, which needs SharedArrayBuffer + threads: the landing (`/`), the
// WebAssembly doc (`/docs/concepts/webassembly`), and the v3 announcement blog
// (`/blog/announce-v3`). `self.crossOriginIsolated` (the gate for SAB) is only
// true when the DOCUMENT carries BOTH Cross-Origin-Opener-Policy: same-origin
// AND Cross-Origin-Embedder-Policy: require-corp. The deployed worker sets these
// per-route via void.json `routing.headers`; `void dev` and `vite preview` do
// NOT replay those, so we stamp them here — but ONLY on those three document
// paths (the migration scoped COEP to the demo pages, not site-wide), so every
// other page stays non-isolated, matching production.
//
// CORP is set UNCONDITIONALLY (on every response, including non-demo pages). It
// is harmless on a non-isolated document, and it is REQUIRED on the demo pages'
// subresources: under COEP:require-corp the browser blocks every subresource the
// isolated page loads (the worker module, the nested wasi-worker, the .wasm, the
// sample image, the `.vite/deps` modules) unless each carries CORP. Those
// subresource requests have their own non-document URLs, so scoping COOP/COEP to
// document paths while keeping CORP everywhere is exactly what makes the demo run
// in dev/preview without leaking isolation onto unrelated pages.
const DUPLICATED_WASM_PKG =
  '@napi-rs/image-wasm32-wasi/@napi-rs/image-wasm32-wasi/'

// Document paths whose response must be cross-origin isolated (COOP + COEP). The
// landing serves at `/` and `/en`; the two demo leaves serve at their canonical
// path AND every locale-prefixed variant that i18n fallback renders 200 (the
// `/en/*` variants 301-redirect to canonical, so they never serve a document and
// need no header). Matched on the pathname only (query/hash stripped). Mirrors
// the void.json `routing.headers` keys for the same paths.
function needsIsolation(url: string | undefined): boolean {
  if (!url) return false
  const pathname = url.split(/[?#]/, 1)[0]
  if (pathname === '/' || pathname === '/en') return true
  // Locale-tolerant match for the two demo leaves: `/`, `/en/`, `/cn/`, `/pt-BR/`
  // prefixes all resolve to the same en document.
  return (
    /^\/(?:en\/|cn\/|pt-BR\/)?docs\/concepts\/webassembly\/?$/.test(pathname) ||
    /^\/(?:en\/|cn\/|pt-BR\/)?blog\/announce-v3\/?$/.test(pathname)
  )
}

function isolationMiddleware(
  req: {
    url?: string
    headers?: Record<string, string | string[] | undefined>
  },
  res: { setHeader: (name: string, value: string) => void },
  next: () => void,
) {
  // CORP on every response (see note above): harmless on non-isolated pages,
  // required on the demo pages' subresources.
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  // COOP + COEP ONLY on the demo document paths, so isolation is scoped and a
  // non-demo page never becomes cross-origin isolated.
  if (needsIsolation(req.url)) {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
  } else if (
    // A dedicated/shared worker spawned BY a require-corp document is itself
    // blocked unless ITS OWN top-level script response also carries
    // COEP:require-corp (the worker must adopt a policy compatible with its
    // owner). In production void.json stamps this via `/assets/*`; `void dev`
    // (the worker is `components/transform-image/worker.ts?worker_file`) and
    // `vite preview` (`/assets/worker-*.js`) replay neither, so the demo worker
    // — and the nested @napi-rs `wasi-worker-browser` it spawns — load with an
    // opaque ONERROR and the transcode silently hangs. `Sec-Fetch-Dest: worker`
    // (or `sharedworker`) is the browser's signal for a worker top-level fetch
    // and is the one discriminator that covers BOTH worker layers in BOTH dev
    // and preview. COOP is intentionally NOT set: it is meaningless on a worker
    // script and we must not broaden document isolation here.
    req.headers?.['sec-fetch-dest'] === 'worker' ||
    req.headers?.['sec-fetch-dest'] === 'sharedworker'
  ) {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
  }
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

  // Force the demo worker's deps into the optimizer's STARTUP pass. The worker
  // (`components/transform-image/worker.ts`) statically imports `buffer` and
  // dynamically imports `@napi-rs/image` (aliased below to the wasm build). The
  // worker sits behind a `with { island: 'idle' }` boundary, so Vite's dep
  // scanner never crawls into it at boot — both deps are otherwise discovered
  // LATE, on the first transform click. That late discovery triggers a
  // re-optimization which churns EVERY `.vite/deps/…?v=<hash>` URL; a
  // worker-context dynamic import that 404s on the now-stale hash does NOT trip
  // Vite's auto full-reload, so the transcode silently fails. Both must be
  // listed — pinning only the codec still lets `buffer` leak in late and re-bump
  // the codec's hash. Pre-including both pins their hashes from boot so the
  // worker's imports always resolve. Dev/preview-only: `vite build` bundles the
  // worker + wasm and never touches the optimizer.
  optimizeDeps: {
    include: ['@napi-rs/image', 'buffer'],
  },

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
        // Build-time changelog data: resolves `virtual:changelog/<slug>` to one
        // package's full release history rendered to HTML (fetched + Shiki'd once
        // per build in Node). The changelog page islands import these, so they
        // carry NO loader and auto-prerender to static, cookie-agnostic HTML.
        changelogData(),
        // Pre-process docs markdown to restore napi.rs code-block affordances
        // BEFORE @void/md compiles it (must precede voidMarkdown so this `pre`
        // transform runs first). Two rewrites:
        //   1. `{n}` fence highlight meta → Shiki notation comments — @void/md's
        //      markdown-it-attrs eats `{…}` before transformerMetaHighlight reads
        //      it, so the meta is inert otherwise (lib/md/fence-highlight.ts).
        //   2. `**filename**` captions → a `<div class="code-filename">` header
        //      bar element (lib/md/code-filename.ts).
        {
          name: 'napi-rs-md-code-blocks',
          enforce: 'pre',
          transform(code: string, id: string) {
            if (!id.endsWith('.md')) return
            const out = markCodeFilenames(convertFenceHighlightMeta(code))
            return out === code ? undefined : out
          },
        },
        // enforce:'pre', auto-detects React → MUST come after voidReact()
        voidMarkdown({
          shiki: {
            // Runtime accepts a theme OBJECT for either half; the @void/md type
            // narrows `themes` to { light: string; dark: string }, so cast the
            // css-variables object to satisfy the declared type (runtime is fine).
            themes: {
              light: 'github-light',
              dark: shikiDarkCssVars as unknown as string,
            },
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
        // Emit sitemap.xml + the raw `.md` assets into the client build output.
        // Defined as a factory in scripts/generate-sitemap.mjs (co-located with
        // the generator), mirroring lib/changelog/plugin.ts.
        sitemapPlugin(),
        // Emit the blog RSS 2.0 feed (rss.xml) into the CLIENT build output, the
        // same way (and for the same reasons) as the sitemap plugin above —
        // `void deploy` runs `vp build`, not `npm run build`, so a build plugin
        // is what guarantees the feed ships. napi.rs itself has no feed; this is
        // net-new. The `<link rel="alternate">` in void.json points browsers /
        // readers at it (scripts/generate-rss.mjs stays usable standalone too).
        {
          name: 'napi-rs-rss',
          apply: 'build',
          writeBundle(options) {
            if (!options.dir || basename(options.dir) !== 'client') return
            const { itemCount, skipped } = generateRss(options.dir)
            console.log(
              `napi-rs-rss: ${itemCount} blog posts -> ${options.dir}/rss.xml` +
                (skipped.length ? ` (skipped: ${skipped.join(', ')})` : ''),
            )
          },
        },
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
      // Shiki HTML for the landing demo code panels — generated wholesale by
      // scripts/build-demo-code.mjs. Exempt so `vp fmt` doesn't reflow the long
      // pre-highlighted HTML strings out of sync with a regen.
      'components/landing/live-demo-code.gen.ts',
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
