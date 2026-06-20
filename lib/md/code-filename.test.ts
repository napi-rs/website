// @vitest-environment node
//
// Unit test for the filename-caption -> header-bar rewrite. See
// lib/md/code-filename.ts and the Vite pre-transform in vite.config.ts.
import { describe, it, expect } from 'vite-plus/test'
import { markCodeFilenames } from './code-filename.ts'

describe('markCodeFilenames', () => {
  it('marks a filename caption before a fence', () => {
    const out = markCodeFilenames('**lib.rs**\n\n```rust\nfn a() {}\n```')
    expect(out).toBe(
      '<div class="code-filename">lib.rs</div>\n\n```rust\nfn a() {}\n```',
    )
  })

  it('handles dotfiles and multi-dot names', () => {
    expect(markCodeFilenames('**.yarnrc.yml**\n```yaml\na: 1\n```')).toBe(
      '<div class="code-filename">.yarnrc.yml</div>\n```yaml\na: 1\n```',
    )
    expect(markCodeFilenames('**index.d.ts**\n```ts\nexport {}\n```')).toBe(
      '<div class="code-filename">index.d.ts</div>\n```ts\nexport {}\n```',
    )
  })

  it('skips non-filename bold captions (Example:, prose labels)', () => {
    const a = '**Example:**\n\n```rust\nfn a() {}\n```'
    expect(markCodeFilenames(a)).toBe(a)
    const b = '**directory structure**\n\n```text\nfoo/\n```'
    expect(markCodeFilenames(b)).toBe(b)
  })

  it('skips a filename-like caption not followed by a fence', () => {
    const a = '**lib.rs**\n\nSome prose, not a code block.'
    expect(markCodeFilenames(a)).toBe(a)
  })

  it('does not touch inline bold inside prose', () => {
    const a = 'See the **lib.rs** file below.\n\n```rust\nfn a() {}\n```'
    expect(markCodeFilenames(a)).toBe(a)
  })

  it('returns input unchanged when there is no bold at all', () => {
    const a = '# Title\n\n```rust\nfn a() {}\n```'
    expect(markCodeFilenames(a)).toBe(a)
  })
})
