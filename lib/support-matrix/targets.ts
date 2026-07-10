// lib/support-matrix/targets.ts
// The target universe for the support-matrix image service. Every triple a
// package can advertise lives here with its OS group, display arch, optional
// ABI, and the pre-derived chip label. This is the canonical vocabulary the
// URL query is resolved against — a self-contained, query-encoded data model
// with no edge / satori / wasm dependencies so it stays plain-vitest testable.

export type OsName =
  | 'Linux'
  | 'Windows'
  | 'macOS'
  | 'Android'
  | 'FreeBSD'
  | 'OpenHarmony'
  | 'Browser'

export interface TargetInfo {
  os: OsName
  // Display architecture (`x64`, `arm64`, `armv7`, `x32`, `ppc64le`, …). Not
  // the Rust arch — this is what the chip shows.
  arch: string
  // Display ABI suffix appended to the label (`gnu` / `musl`). Absent when the
  // label is arch-only (windows/macos/android/freebsd/ohos, and the ppc64le /
  // s390x linux targets whose label is intentionally just the arch).
  abi?: string
  // Pre-derived chip label = `{arch}[ {abi}]`.
  label: string
}

// Build one entry, deriving `label` from arch + abi so the display rule has a
// single source of truth and can never drift from the arch/abi fields.
function t(os: OsName, arch: string, abi?: string): TargetInfo {
  return abi
    ? { os, arch, abi, label: `${arch} ${abi}` }
    : { os, arch, label: arch }
}

// The full target universe, grouped by OS in the order sections render. Keys
// are canonical Rust triples. `satisfies` keeps the key union available as
// `Triple` while still constraining every value to TargetInfo.
export const TARGETS = {
  // macOS
  'x86_64-apple-darwin': t('macOS', 'x64'),
  'aarch64-apple-darwin': t('macOS', 'arm64'),

  // Windows
  'x86_64-pc-windows-msvc': t('Windows', 'x64'),
  'i686-pc-windows-msvc': t('Windows', 'x32'),
  'aarch64-pc-windows-msvc': t('Windows', 'arm64'),

  // Linux
  'x86_64-unknown-linux-gnu': t('Linux', 'x64', 'gnu'),
  'aarch64-unknown-linux-gnu': t('Linux', 'arm64', 'gnu'),
  'armv7-unknown-linux-gnueabihf': t('Linux', 'armv7', 'gnu'),
  'x86_64-unknown-linux-musl': t('Linux', 'x64', 'musl'),
  'aarch64-unknown-linux-musl': t('Linux', 'arm64', 'musl'),
  'armv7-unknown-linux-musleabihf': t('Linux', 'armv7', 'musl'),
  'riscv64gc-unknown-linux-gnu': t('Linux', 'riscv64', 'gnu'),
  'riscv64gc-unknown-linux-musl': t('Linux', 'riscv64', 'musl'),
  'powerpc64le-unknown-linux-gnu': t('Linux', 'ppc64le'),
  's390x-unknown-linux-gnu': t('Linux', 's390x'),

  // Android
  'aarch64-linux-android': t('Android', 'arm64'),
  'armv7-linux-androideabi': t('Android', 'armv7'),

  // FreeBSD
  'x86_64-unknown-freebsd': t('FreeBSD', 'x64'),
  'aarch64-unknown-freebsd': t('FreeBSD', 'arm64'),

  // OpenHarmony
  'x86_64-unknown-linux-ohos': t('OpenHarmony', 'x64'),
  'aarch64-unknown-linux-ohos': t('OpenHarmony', 'arm64'),
  'armv7-unknown-linux-ohos': t('OpenHarmony', 'armv7'),

  // Browser (wasm)
  'wasm32-wasip1-threads': t('Browser', 'wasm32-wasi'),
} satisfies Record<string, TargetInfo>

export type Triple = keyof typeof TARGETS

// The `full` scaffold set — exactly the targets `napi new` generates. Explicit
// (rather than derived) so `full` stays pinned to the scaffold even as extra
// targets are added to TARGETS above.
export const FULL: Triple[] = [
  'x86_64-apple-darwin',
  'aarch64-apple-darwin',
  'x86_64-pc-windows-msvc',
  'i686-pc-windows-msvc',
  'aarch64-pc-windows-msvc',
  'x86_64-unknown-linux-gnu',
  'aarch64-unknown-linux-gnu',
  'armv7-unknown-linux-gnueabihf',
  'x86_64-unknown-linux-musl',
  'aarch64-unknown-linux-musl',
  'aarch64-linux-android',
  'armv7-linux-androideabi',
  'x86_64-unknown-freebsd',
  'wasm32-wasip1-threads',
]

// Accepted alternate spellings → canonical triple. Both spellings resolve to
// the same entry via normalizeTriple.
export const ALIASES: Record<string, Triple> = {
  'wasm32-wasi-preview1-threads': 'wasm32-wasip1-threads',
  'arm-linux-androideabi': 'armv7-linux-androideabi',
}

// Triples bucketed by lowercased OS name (`linux`, `windows`, …). This is the
// vocabulary `omit=<os>` matches against, and the render grouping source.
export const OS_GROUPS: Record<string, Triple[]> = (() => {
  const groups: Record<string, Triple[]> = {}
  for (const triple of Object.keys(TARGETS) as Triple[]) {
    const key = TARGETS[triple].os.toLowerCase()
    ;(groups[key] ??= []).push(triple)
  }
  return groups
})()

// Normalize an untrusted triple string to its canonical form, or null when it
// is unknown / malformed. Never throws. `Object.hasOwn` guards against
// prototype keys (`'__proto__' in TARGETS` is otherwise true).
export function normalizeTriple(
  input: string | null | undefined,
): Triple | null {
  if (typeof input !== 'string') return null
  const value = input.trim()
  if (!value) return null
  if (Object.hasOwn(ALIASES, value)) return ALIASES[value]
  if (Object.hasOwn(TARGETS, value)) return value as Triple
  return null
}
