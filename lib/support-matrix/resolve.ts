// lib/support-matrix/resolve.ts
// Resolves a parsed support-matrix query into the render model. The query is a
// plain record of already-parsed params (the URL parsing lives in the route
// task); this module applies the exact resolution order and never throws on
// bad input — unknown triples, unknown OS groups and malformed params are all
// silently skipped, mirroring the "normalize an untrusted param" style.

import { deriveNode, NODE_LATEST, type NodeModel } from './node.ts'
import {
  TARGETS,
  FULL,
  OS_GROUPS,
  normalizeTriple,
  type Triple,
  type OsName,
} from './targets.ts'

export type Tier = 'tested' | 'nonblocking' | 'untested'

export interface Chip {
  label: string
  tier: Tier
}

export interface OsSection {
  os: OsName
  chips: Chip[]
}

export interface BrowserModel {
  chips: Chip[]
}

export interface MatrixModel {
  name?: string
  node: NodeModel | null
  platforms: OsSection[]
  browser: BrowserModel | null
}

// A single already-parsed param: a string, a repeated-param array, or absent.
type QueryValue = string | string[] | number[] | null | undefined

export interface MatrixQuery {
  tested?: QueryValue
  nonblocking?: QueryValue
  untested?: QueryValue
  omit?: QueryValue
  wasm?: QueryValue
  name?: QueryValue
  engines?: QueryValue
  nodeTested?: QueryValue
}

const TIERS: Tier[] = ['tested', 'nonblocking', 'untested']
// Most-severe wins when a triple lands in two tiers.
const SEVERITY: Record<Tier, number> = {
  tested: 0,
  nonblocking: 1,
  untested: 2,
}
// Platform sections render in this order; Browser is handled separately.
const OS_ORDER: OsName[] = [
  'macOS',
  'Windows',
  'Linux',
  'Android',
  'FreeBSD',
  'OpenHarmony',
]
const WASM_TRIPLE: Triple = 'wasm32-wasip1-threads'
const FALSY = new Set(['', '0', 'false', 'no', 'off'])

// Flatten a param into trimmed, comma-split tokens (both `a,b` and repeated
// params are accepted). Empty pieces are dropped.
function toList(value: QueryValue): string[] {
  if (value == null) return []
  const arr = Array.isArray(value) ? value : [value]
  const out: string[] = []
  for (const item of arr) {
    if (item == null) continue
    for (const piece of String(item).split(',')) {
      const token = piece.trim()
      if (token) out.push(token)
    }
  }
  return out
}

// A param is truthy unless it is absent or an explicit falsy token.
function isTruthy(value: QueryValue): boolean {
  const [first] = toList(value)
  return first !== undefined && !FALSY.has(first.toLowerCase())
}

function parseName(value: QueryValue): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw == null) return undefined
  // Cap at the npm package-name max so an oversized param can't bloat the model.
  const name = String(raw).trim().slice(0, 214)
  return name || undefined
}

function parseEngines(value: QueryValue): string {
  const raw = Array.isArray(value) ? value[0] : value
  // Cap the raw range so a giant `engines` param can't bloat the model and OOM
  // the isolate when `card.ts` draws it verbatim. Real `engines.node` fields are
  // < ~40 chars (the spec's longest example is 24); 64 is generous. Mirrors the
  // `parseName` cap.
  return raw == null ? '' : String(raw).trim().slice(0, 64)
}

function parseNodeTested(value: QueryValue): number[] {
  const out: number[] = []
  for (const token of toList(value)) {
    // Only clean integers — `parseInt` would otherwise turn `22garbage` into 22
    // and paint a bogus green major.
    if (!/^\d+$/.test(token)) continue
    const n = Number.parseInt(token, 10)
    if (Number.isInteger(n) && n > 0 && n < 1000) out.push(n)
  }
  return out
}

function assignMostSevere(
  map: Map<Triple, Tier>,
  triple: Triple,
  tier: Tier,
): void {
  const current = map.get(triple)
  if (current === undefined || SEVERITY[tier] > SEVERITY[current]) {
    map.set(triple, tier)
  }
}

export function resolveMatrix(query: MatrixQuery = {}): MatrixModel {
  // (1) expand `full` into a seed tier; (2) collect explicit triples. Explicit
  // assignments override seeds; among explicit tiers the most-severe wins.
  const seed = new Map<Triple, Tier>()
  const explicit = new Map<Triple, Tier>()
  for (const tier of TIERS) {
    for (const token of toList(query[tier])) {
      if (token.toLowerCase() === 'full') {
        for (const triple of FULL) assignMostSevere(seed, triple, tier)
      } else {
        const triple = normalizeTriple(token)
        if (triple) assignMostSevere(explicit, triple, tier)
      }
    }
  }

  // `wasm` flag: ensure the wasm target shows (tested) unless a tier set it.
  if (
    isTruthy(query.wasm) &&
    !explicit.has(WASM_TRIPLE) &&
    !seed.has(WASM_TRIPLE)
  ) {
    seed.set(WASM_TRIPLE, 'tested')
  }

  const resolved = new Map<Triple, Tier>(seed)
  for (const [triple, tier] of explicit) resolved.set(triple, tier)

  // (3) omit — accepts OS-group names (lowercased) or individual triples.
  for (const token of toList(query.omit)) {
    const key = token.toLowerCase()
    if (Object.hasOwn(OS_GROUPS, key)) {
      for (const triple of OS_GROUPS[key]) resolved.delete(triple)
    } else {
      const triple = normalizeTriple(token)
      if (triple) resolved.delete(triple)
    }
  }

  // (4) group survivors by OS. Iterating TARGETS keeps chip order deterministic
  // (definition order); the wasm/Browser triple is diverted to its own section.
  const buckets = new Map<OsName, Chip[]>()
  const browserChips: Chip[] = []
  for (const triple of Object.keys(TARGETS) as Triple[]) {
    const tier = resolved.get(triple)
    if (!tier) continue
    const info = TARGETS[triple]
    const chip: Chip = { label: info.label, tier }
    if (info.os === 'Browser') {
      browserChips.push(chip)
    } else {
      const list = buckets.get(info.os)
      if (list) list.push(chip)
      else buckets.set(info.os, [chip])
    }
  }

  const platforms: OsSection[] = []
  for (const os of OS_ORDER) {
    const chips = buckets.get(os)
    if (chips && chips.length) platforms.push({ os, chips })
  }

  // Browser section present iff a wasm triple survived OR `wasm` is truthy.
  const browser: BrowserModel | null =
    browserChips.length > 0 || isTruthy(query.wasm)
      ? { chips: browserChips }
      : null

  const enginesRaw = parseEngines(query.engines)
  const node: NodeModel | null = enginesRaw
    ? deriveNode(enginesRaw, parseNodeTested(query.nodeTested), NODE_LATEST)
    : null

  const model: MatrixModel = { node, platforms, browser }
  const name = parseName(query.name)
  if (name) model.name = name
  return model
}
