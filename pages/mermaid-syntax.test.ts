// @vitest-environment node
//
// Headless syntax check for every ```mermaid fence in the docs.
//
// MermaidBlocks swaps a fence for the rendered SVG client-side, but a fence
// that fails to parse silently stays a plain code block. Parsing every fence
// here catches typos at test time instead of at runtime.
//
// Both trees are checked: content/**/*.mdx is the source authors edit, and
// pages/<locale>/docs/**/*.md is the generated tree the site actually serves.
// Checking only the source would pass while a stale mirror shipped something
// else entirely, so the per-file count check below guards that drift too.
//
// Limits of parse-only checking, both verified against mermaid 11.16:
//   - mermaid.render() cannot run here (no DOM), so a fence that parses but
//     fails to lay out is not caught.
//   - edge-animation metadata is not validated. `e99@{ animate: true }` for an
//     undeclared edge, and bogus keys inside the braces, both parse clean and
//     would ship as a silently static diagram.
//
// mermaid imports dompurify (a browser-only module) for label sanitization;
// node has no DOM, so it is stubbed with a pass-through — parse-only checks
// never exercise real sanitization. mermaid must be inlined (see the
// `server.deps.inline` entry in vite.config.ts) or this mock would not reach
// its internal imports.
import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vite-plus/test'

vi.mock('dompurify', () => ({
  default: {
    sanitize: (x: string) => x,
    addHook: () => {},
    removeHook: () => {},
    removeAllHooks: () => {},
    setConfig: () => {},
    isValidAttribute: () => true,
  },
}))

const FENCE_RE = /```mermaid[ \t]*\r?\n[\s\S]*?\r?\n```/g
// Counts fence openers independently of FENCE_RE, so a fence the extractor
// fails to match is a red test rather than a silently skipped one.
const OPENER_RE = /^[ \t]*```mermaid[ \t]*$/gm

function fencesIn(file: string) {
  const src = readFileSync(file, 'utf8')
  return {
    openers: (src.match(OPENER_RE) ?? []).length,
    sources: (src.match(FENCE_RE) ?? []).map((fence) =>
      fence.replace(/^```mermaid[ \t]*\r?\n/, '').replace(/\r?\n```$/, ''),
    ),
  }
}

// { file, index, source } for every fence across both trees.
const files = [
  ...globSync('content/**/*.mdx'),
  ...globSync('pages/*/docs/**/*.md'),
].toSorted()

const fences = files.flatMap((file) =>
  fencesIn(file).sources.map((source, index) => ({ file, index, source })),
)

describe('mermaid fences parse', () => {
  it('finds fences in both trees (guard against a broken glob)', () => {
    expect(
      fences.filter((f) => f.file.startsWith('content/')).length,
    ).toBeGreaterThan(0)
    expect(
      fences.filter((f) => f.file.startsWith('pages/')).length,
    ).toBeGreaterThan(0)
  })

  it.for(files)('%s — every fence opener is extracted', (file) => {
    const { openers, sources } = fencesIn(file)
    expect(sources.length).toBe(openers)
  })

  for (const { file, index, source } of fences) {
    it(`${file} fence #${index + 1}`, async () => {
      const { default: mermaid } = await import('mermaid')
      await expect(mermaid.parse(source)).resolves.toMatchObject({
        diagramType: expect.any(String),
      })
    })
  }
})

// The generated tree is what ships. If a fence is added to or removed from a
// content/ page and the converter is not re-run, the site keeps serving the
// old body — invisible to every other test in the suite.
describe('generated pages mirror the content tree', () => {
  const sources = globSync('content/docs/**/*.mdx').toSorted()

  it('finds source pages (guard against a broken glob)', () => {
    expect(sources.length).toBeGreaterThan(0)
  })

  it.for(sources)('%s is in sync', (source) => {
    const match = source.match(/^content\/docs\/(.+)\.([^.]+)\.mdx$/)
    expect(match, `unexpected content path: ${source}`).not.toBeNull()
    const [, route, locale] = match!
    const generated = `pages/${locale}/docs/${route}.md`

    expect(fencesIn(generated).sources).toEqual(fencesIn(source).sources)
  })
})
