// components/support-matrix-builder/index.tsx
// The interactive URL-builder for the /support-matrix.svg|png badge. A maintainer
// pastes their `napi.targets`, marks per-target tiers, fills in engines / tested
// node majors / package name, picks a badge theme, and this component shows a
// LIVE `<img>` preview plus copy-paste `<picture>` + PNG-markdown snippets for a
// README. It is mounted as a `load` island by pages/support-matrix.island.tsx.
//
// It imports ONLY pure helpers (query + targets) — never the renderer / satori /
// resvg / wasm — so the client bundle stays tiny; the preview is just an <img>
// pointed at the edge route. Rendering is deterministic (no window/navigator read
// during render), so it SSRs and hydrates without mismatch; clipboard access is
// confined to click handlers and guarded.
import { useMemo, useState } from 'react'

import {
  buildSupportMatrixQuery,
  type SupportMatrixQueryInput,
} from '../../lib/support-matrix/query.ts'
import { FULL, normalizeTriple } from '../../lib/support-matrix/targets.ts'

type Tier = 'tested' | 'nonblocking' | 'untested'
type BadgeTheme = 'light' | 'dark'

// README snippets must be absolute (that's what renders on GitHub/npm/crates);
// the live preview uses the relative path so it also works in dev/preview.
const SITE = 'https://napi.rs'

const TIERS: Tier[] = ['tested', 'nonblocking', 'untested']
const TIER_LABEL: Record<Tier, string> = {
  tested: 'Tested',
  nonblocking: 'Non-blocking',
  untested: 'Untested',
}
// Triples the `full` scaffold set already covers — a tested one is redundant to
// list once `full` is on, so we drop it from the emitted `tested` param.
const FULL_SET = new Set<string>(FULL)

// A friendly starting point: the extra targets a scaffold package often adds on
// top of `full` (ppc64le / s390x / riscv), so the preview is non-trivial.
const DEFAULT_TARGETS = [
  'powerpc64le-unknown-linux-gnu',
  's390x-unknown-linux-gnu',
  'riscv64gc-unknown-linux-gnu',
].join('\n')

// Lenient paste parser: accepts a JSON array, or a comma/space/newline list.
// Strips wrapping quotes/brackets per token; dedupes, preserves order.
function parseTargets(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const piece of raw.split(/[\s,]+/)) {
    const token = piece.replace(/^["'[\]]+|["'[\]]+$/g, '').trim()
    if (token && !seen.has(token)) {
      seen.add(token)
      out.push(token)
    }
  }
  return out
}

// Comma/space list of node majors → finite integers. Only whole-digit tokens
// count, so a mistyped `22garbage` is dropped rather than becoming 22 (which
// would render a bogus CI-tested pill in the live preview).
function parseMajors(raw: string): number[] {
  const out: number[] = []
  for (const piece of raw.split(/[\s,]+/)) {
    if (!/^\d+$/.test(piece)) continue
    const n = Number.parseInt(piece, 10)
    if (Number.isInteger(n)) out.push(n)
  }
  return out
}

export default function SupportMatrixBuilder() {
  const [rawTargets, setRawTargets] = useState(DEFAULT_TARGETS)
  const [full, setFull] = useState(true)
  const [tiers, setTiers] = useState<Record<string, Tier>>({})
  const [wasm, setWasm] = useState(false)
  const [name, setName] = useState('')
  const [engines, setEngines] = useState('^22.20 || ^24.12 || >=25')
  const [nodeTested, setNodeTested] = useState('22, 24')
  const [badgeTheme, setBadgeTheme] = useState<BadgeTheme>('light')
  const [copied, setCopied] = useState<string | null>(null)

  const targets = useMemo(() => parseTargets(rawTargets), [rawTargets])

  // Build the query input for a given badge theme. Tier lists come from the per
  // -target selects; `full` prepends the scaffold token and drops tested triples
  // it already covers. Emitted verbatim — the route normalizes aliases later.
  const buildInput = useMemo(() => {
    return (theme: BadgeTheme | undefined): SupportMatrixQueryInput => {
      const tested: string[] = []
      const nonblocking: string[] = []
      const untested: string[] = []
      for (const triple of targets) {
        const tier = tiers[triple] ?? 'tested'
        if (tier === 'nonblocking') nonblocking.push(triple)
        else if (tier === 'untested') untested.push(triple)
        else tested.push(triple)
      }
      const testedOut = full
        ? [
            'full',
            ...tested.filter((t) => {
              const canonical = normalizeTriple(t)
              return !(canonical && FULL_SET.has(canonical))
            }),
          ]
        : tested
      return {
        tested: testedOut,
        nonblocking,
        untested,
        wasm: wasm || undefined,
        name: name.trim() || undefined,
        engines: engines.trim() || undefined,
        nodeTested: parseMajors(nodeTested),
        theme,
      }
    }
  }, [targets, tiers, full, wasm, name, engines, nodeTested])

  // light → no theme param (the parser's default); dark → theme=dark.
  const previewQuery = useMemo(
    () => buildSupportMatrixQuery(buildInput(badgeTheme)),
    [buildInput, badgeTheme],
  )
  const lightQuery = useMemo(
    () => buildSupportMatrixQuery(buildInput('light')),
    [buildInput],
  )
  const darkQuery = useMemo(
    () => buildSupportMatrixQuery(buildInput('dark')),
    [buildInput],
  )

  const altText = `${name.trim() || 'napi-rs'} support matrix`
  const pictureSnippet = `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="${SITE}/support-matrix.svg?${darkQuery}" />
  <img alt="${altText}" src="${SITE}/support-matrix.svg?${lightQuery}" />
</picture>`
  const pngSnippet = `![${altText}](${SITE}/support-matrix.png?${previewQuery})`

  const copy = (text: string, key: string) => {
    // Guarded: clipboard is client-only and can be absent (insecure origin, SSR).
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(key)
        globalThis.setTimeout(
          () => setCopied((current) => (current === key ? null : current)),
          1500,
        )
      },
      () => {
        /* ignore rejection (permissions / insecure origin) */
      },
    )
  }

  const setTier = (triple: string, tier: Tier) =>
    setTiers((prev) => ({ ...prev, [triple]: tier }))

  const fieldCls =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground'
  const labelCls = 'mb-1 block text-sm font-medium text-foreground'

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ---- Controls ---- */}
      <div className="flex flex-col gap-5">
        <div>
          <label className={labelCls} htmlFor="sm-targets">
            napi.targets (paste the JSON array, or a comma / newline list)
          </label>
          <textarea
            id="sm-targets"
            className={`${fieldCls} h-32 font-mono`}
            value={rawTargets}
            onChange={(e) => setRawTargets(e.target.value)}
            spellCheck={false}
            placeholder='["x86_64-apple-darwin", "aarch64-apple-darwin"]'
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={full}
            onChange={(e) => setFull(e.target.checked)}
          />
          Supports the standard scaffold set (<code>tested=full</code>); the
          pasted targets are additions / overrides
        </label>

        {targets.length > 0 && (
          <div className="rounded-md border border-border">
            <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Per-target tier
            </div>
            <ul className="divide-y divide-border">
              {targets.map((triple) => {
                const known = normalizeTriple(triple) != null
                return (
                  <li
                    key={triple}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <code
                      className={`truncate text-xs ${
                        known ? 'text-foreground' : 'text-red-500'
                      }`}
                      title={known ? triple : `${triple} — unknown triple`}
                    >
                      {triple}
                      {!known && ' ⚠'}
                    </code>
                    <select
                      className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                      value={tiers[triple] ?? 'tested'}
                      onChange={(e) => setTier(triple, e.target.value as Tier)}
                    >
                      {TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {TIER_LABEL[tier]}
                        </option>
                      ))}
                    </select>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="sm-name">
              Package name
            </label>
            <input
              id="sm-name"
              className={fieldCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="@napi-rs/lzma"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="sm-node-tested">
              Tested node majors
            </label>
            <input
              id="sm-node-tested"
              className={fieldCls}
              value={nodeTested}
              onChange={(e) => setNodeTested(e.target.value)}
              placeholder="22, 24"
            />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="sm-engines">
            engines.node (semver range)
          </label>
          <input
            id="sm-engines"
            className={`${fieldCls} font-mono`}
            value={engines}
            onChange={(e) => setEngines(e.target.value)}
            placeholder="^22.20 || ^24.12 || >=25"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={wasm}
              onChange={(e) => setWasm(e.target.checked)}
            />
            Force the Browser (wasm) card
          </label>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <span>Badge theme</span>
            <div className="inline-flex overflow-hidden rounded-md border border-border">
              {(['light', 'dark'] as BadgeTheme[]).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setBadgeTheme(theme)}
                  className={`px-3 py-1 text-xs capitalize ${
                    badgeTheme === theme
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Preview + snippets ---- */}
      <div className="flex flex-col gap-5">
        <div>
          <div className={labelCls}>Live preview</div>
          <div className="overflow-x-auto rounded-md border border-border bg-muted p-3">
            {/* Relative src so it resolves in dev/preview as well as prod. */}
            <img
              src={`/support-matrix.svg?${previewQuery}`}
              alt="support matrix preview"
              className="max-w-full"
            />
          </div>
        </div>

        <Snippet
          title="README <picture> (auto light / dark)"
          code={pictureSnippet}
          copied={copied === 'picture'}
          onCopy={() => copy(pictureSnippet, 'picture')}
        />
        <Snippet
          title="README PNG (markdown)"
          code={pngSnippet}
          copied={copied === 'png'}
          onCopy={() => copy(pngSnippet, 'png')}
        />
      </div>
    </div>
  )
}

function Snippet({
  title,
  code,
  copied,
  onCopy,
}: {
  title: string
  code: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 text-xs text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  )
}
