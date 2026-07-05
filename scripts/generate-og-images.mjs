// scripts/generate-og-images.mjs
//
// Build-time per-page Open Graph image generator for the napi.rs docs site.
// Renders a branded 1200×630 title card per DOCS + BLOG route into
// dist/client/og/<route>.png so social/link-preview crawlers get a unique image
// per page. Islands (home / landing / changelog) keep the static /img/og-v2.png
// and are intentionally NOT covered here — they have no `.md` source anyway.
//
// Pipeline: satori (a React element → SVG) → @resvg/resvg-js (SVG → PNG bytes).
// satori has NO system-font fallback, so a real .ttf/.otf buffer MUST be handed
// in for every family used. We read STATIC TTFs shipped by the OFL-licensed
// @expo-google-fonts packages (no binary committed to the repo) — Manrope 700
// for the title, Inter 600 for the wordmark.
//
// Wired into the build via `ogImagePlugin()` (registered in vite.config.ts,
// right after sitemapPlugin). It mirrors sitemapPlugin's shape exactly:
// `apply:'build'` + `writeBundle(options)` guarded by `basename(dir)==='client'`
// — Void runs TWO build environments (void_worker → dist/ssr, client →
// dist/client) and only the client output should carry these assets.
// `renderOg` + `ogRoutes` stay exported for the unit test / standalone use.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import React from 'react'
import { walkPages, fileToRoute } from './generate-sitemap.mjs'
import { splitLocale } from '../lib/docs/locale.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const pagesDir = join(root, 'pages')

// Static OFL TTFs shipped by @expo-google-fonts (build-only devDependencies).
// The exact on-disk paths were confirmed empirically — the packages nest each
// weight in its own directory (…/700Bold/Manrope_700Bold.ttf). satori requires
// a real .ttf/.otf buffer (NOT woff2) and throws without one, so these MUST
// resolve at build time.
//
// Read lazily + memoized: these three TTFs total ~11 MB (incl the ~10 MB Noto
// Sans SC), and this module is imported by vite.config.ts for EVERY dev server
// start and `vp test` run — none of which render an OG image. Deferring the
// reads to the first `renderOg` call keeps importing the module (or calling
// `ogImagePlugin()`) allocation-free; the build path reads each file once.
let fontsCache = null
function getFonts() {
  if (fontsCache) return fontsCache
  fontsCache = [
    {
      name: 'Manrope',
      data: readFileSync(
        join(
          root,
          'node_modules/@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf',
        ),
      ),
      weight: 700,
      style: 'normal',
    },
    {
      name: 'Inter',
      data: readFileSync(
        join(
          root,
          'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
        ),
      ),
      weight: 600,
      style: 'normal',
    },
    // CJK fallback for the title. Manrope/Inter carry NO Han glyphs, so the `cn`
    // locale's Chinese titles would otherwise render as satori "NO GLYPH" tofu.
    // satori uses this full Noto Sans SC weight only to fill glyphs the Latin
    // title font lacks — Latin cards are unchanged.
    {
      name: 'Noto Sans SC',
      data: readFileSync(
        join(
          root,
          'node_modules/@expo-google-fonts/noto-sans-sc/700Bold/NotoSansSC_700Bold.ttf',
        ),
      ),
      weight: 700,
      style: 'normal',
    },
  ]
  return fontsCache
}

// Defensive: strip the ` – NAPI-RS` HTML-<title> suffix. Frontmatter `title`
// values do not carry it, but a title derived elsewhere might.
const TITLE_SUFFIX_RE = /\s+[–—-]\s+NAPI-RS\s*$/

/**
 * The OG card as a React element tree (satori accepts a React node directly).
 * 1200×630 canvas, #111111 bg, an #e66000 accent bar, the page title in Manrope
 * 700 white, and the `napi.rs` wordmark in Inter 600 accent. Every leaf that
 * holds text sets `display:'flex'` because satori requires an explicit display
 * on non-text nodes.
 */
function ogTemplate(title) {
  const h = React.createElement
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#111111',
        padding: '80px',
        color: '#fafafa',
      },
    },
    h('div', {
      style: { width: '120px', height: '10px', background: '#e66000' },
    }),
    h(
      'div',
      {
        style: {
          fontFamily: 'Manrope, "Noto Sans SC"',
          fontSize: 72,
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          display: 'flex',
        },
      },
      title,
    ),
    h(
      'div',
      {
        style: {
          fontFamily: 'Inter',
          fontSize: 32,
          fontWeight: 600,
          color: '#e66000',
          display: 'flex',
        },
      },
      'napi.rs',
    ),
  )
}

/** Render a title card to a PNG Buffer (satori → SVG → resvg → PNG). */
export async function renderOg(title) {
  const svg = await satori(ogTemplate(title), {
    width: 1200,
    height: 630,
    fonts: getFonts(),
  })
  return new Resvg(svg).render().asPng()
}

/**
 * Public routes scoped to DOCS + BLOG only, each paired with the page title read
 * from its `.md` frontmatter. Reuses `walkPages` + `fileToRoute` (the sitemap's
 * authoritative route derivation) and filters via `splitLocale` so cn / pt-BR
 * pages (`/cn/docs/…`, `/pt-BR/blog/…`) are covered too. Titles fall back to the
 * route remainder when no frontmatter `title` is present.
 */
export function ogRoutes() {
  const out = []
  for (const rel of walkPages(pagesDir)) {
    if (!rel.endsWith('.md')) continue
    const route = fileToRoute(rel)
    if (route === null) continue
    const [, rest] = splitLocale(route)
    if (!(rest.startsWith('docs/') || rest.startsWith('blog/'))) continue
    const src = readFileSync(join(pagesDir, rel), 'utf8')
    // `/m` so `title:` is found even when a byte-0 `<script>` island block
    // precedes the frontmatter (blog announce pages); optional quotes stripped.
    const m = src.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)
    const title = (m ? m[1] : rest).replace(TITLE_SUFFIX_RE, '')
    out.push({ route, title })
  }
  return out
}

/**
 * Vite build plugin: after the CLIENT bundle is written, render one PNG per
 * docs/blog route into `<dist/client>/og/<route>.png`. Mirrors sitemapPlugin's
 * shape — `apply:'build'`, `writeBundle`, and the `basename(dir)==='client'`
 * guard so it runs exactly once, against the client output only.
 */
export function ogImagePlugin() {
  return {
    name: 'napi-rs-og-images',
    apply: 'build',
    async writeBundle(options) {
      if (!options.dir || basename(options.dir) !== 'client') return
      let n = 0
      for (const { route, title } of ogRoutes()) {
        const png = await renderOg(title)
        const outPath = join(
          options.dir,
          'og',
          `${route.replace(/^\//, '')}.png`,
        )
        mkdirSync(dirname(outPath), { recursive: true })
        writeFileSync(outPath, png)
        n++
      }
      console.log(
        `napi-rs-og-images: ${n} images -> ${join(options.dir, 'og')}`,
      )
    },
  }
}
