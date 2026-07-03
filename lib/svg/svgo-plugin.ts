import { readFileSync } from 'node:fs'
import { optimize, type Config } from 'svgo'
import type { Plugin } from 'vite'

// SVGO "safe" preset — the conservative config verified against every hand-authored
// inline SVG on the landing. It deliberately disables the transforms that would
// break something the page depends on:
//   - cleanupIds / mergePaths / collapseGroups OFF → per-path `class="themed"`,
//     `class="rect-1"`, `class="drawLine"`, and gradient/clip `id=`s all survive
//     (external CSS recolor + the CSS-only install-flow animation target them).
//   - convertShapeToPath / convertEllipseToCircle OFF → <rect>/<circle> keep their
//     element type (CSS + the animation match them by tag).
//   - removeDesc OFF                    → <desc> that aria-describedby targets.
//   - removeUselessStrokeAndFill OFF    → the install-flow `.drawLine` connectors
//     carry `stroke-width="1.5" stroke-linecap="round"` but get their stroke COLOR
//     only from CSS (`.drawLine { stroke:#13b351 }`), so SVGO sees "no stroke paint"
//     and, left on, strips width+linecap → the animated lines would render at the
//     browser-default 1px butt cap instead of 1.5px round. Keep it off.
// The keys below are exactly the members of svgo v4's `preset-default` (removeViewBox
// / removeTitle are NOT in it and only warn if listed — and the root <svg>, hence its
// viewBox, is stripped by innerOf() anyway). Exported so a standalone svgo run / test
// can reuse the exact same config.
export const svgoSafeConfig: Config = {
  multipass: false,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIds: false,
          removeDesc: false,
          removeUselessStrokeAndFill: false,
          convertShapeToPath: false,
          convertEllipseToCircle: false,
          mergePaths: false,
          collapseGroups: false,
          moveGroupAttrsToElems: false,
          moveElemsAttrsToGroup: false,
          inlineStyles: false,
          minifyStyles: false,
        },
      },
    },
  ],
}

const SUFFIX = '?svgo'

// Strip the root <svg …> wrapper → keep only the inner markup (children + <defs>).
// SVGO output is minified to a single line and has no XML prolog / doctype /
// comments (preset-default removes them), so it always starts with `<svg …>` and
// ends with `</svg>`; a root attribute can never contain a literal `>`.
function innerOf(svg: string): string {
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
}

/**
 * `import inner from './logo.svg?svgo'` → the SVGO-optimized INNER markup of the
 * file (root `<svg>` stripped) as a plain string, for inlining into a host
 * `<svg>` element via `dangerouslySetInnerHTML`.
 *
 * Why inline (not a URL / `<img>`): the host page's CSS must reach the paths.
 * The ecosystem wall recolors monochrome marks with `.ecosystem.dark .themed {
 * fill:white }` and the install-flow diagram animates `.rect`/`.drawLine`/`.check`
 * on `.active` — both target inner elements by class, which only resolves when
 * those elements are real DOM in the document (a `<use>` shadow tree or an `<img>`
 * would not match). Returning the INNER (not the whole `<svg>`) leaves the JSX
 * host `<svg>` — with its own `className` / `width` / `viewBox` — completely
 * untouched: no wrapper element, no nested `<svg>`, no lost classes.
 *
 * The source .svg files hold the ORIGINAL hand-authored geometry; optimization
 * happens here at build time, so editing a logo re-optimizes it on the next build.
 */
export function svgoInline(): Plugin {
  return {
    name: 'napi-rs-svgo-inline',
    // Beat Vite's built-in `*.svg` asset handling (which would emit a URL).
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!source.endsWith(SUFFIX)) return null
      const resolved = await this.resolve(
        source.slice(0, -SUFFIX.length),
        importer,
        { skipSelf: true },
      )
      return resolved ? resolved.id + SUFFIX : null
    },
    load(id) {
      if (!id.endsWith(SUFFIX)) return null
      const file = id.slice(0, -SUFFIX.length)
      this.addWatchFile(file) // re-run when the .svg source changes (HMR)
      const { data } = optimize(readFileSync(file, 'utf8'), {
        path: file,
        ...svgoSafeConfig,
      })
      return {
        code: `export default ${JSON.stringify(innerOf(data))}`,
        map: null,
      }
    },
  }
}
