// @vitest-environment node
//
// Unit test for the `{n}` -> Shiki-notation fence-highlight rewrite used by the
// Vite pre-transform in vite.config.ts. See lib/md/fence-highlight.ts for why.
import { describe, it, expect } from 'vite-plus/test'
import { convertFenceHighlightMeta } from './fence-highlight.ts'

describe('convertFenceHighlightMeta', () => {
  it('rewrites a single-line spec to a // notation comment', () => {
    const out = convertFenceHighlightMeta('```rust {2}\nlet a;\nlet b;\n```')
    expect(out).toBe('```rust\nlet a;\nlet b; // [!code highlight]\n```')
  })

  it('expands ranges and comma lists', () => {
    const out = convertFenceHighlightMeta('```rust {1,3-4}\na\nb\nc\nd\ne\n```')
    expect(out.split('\n')).toEqual([
      '```rust',
      'a // [!code highlight]',
      'b',
      'c // [!code highlight]',
      'd // [!code highlight]',
      'e',
      '```',
    ])
  })

  it('uses # for shell/toml languages', () => {
    const out = convertFenceHighlightMeta('```bash {1}\necho hi\n```')
    expect(out).toBe('```bash\necho hi # [!code highlight]\n```')
  })

  it('leaves languages without a comment syntax (text) untouched', () => {
    const src = '```text {1,2}\nfoo\nbar\n```'
    expect(convertFenceHighlightMeta(src)).toBe(src)
  })

  it('keeps an existing trailing comment on a highlighted line', () => {
    const out = convertFenceHighlightMeta('```ts {1}\nconst a = 1 // note\n```')
    expect(out).toBe('```ts\nconst a = 1 // note // [!code highlight]\n```')
  })

  it('does not touch fences without a highlight spec', () => {
    const src = '```rust\nlet a;\n```\n\ntext `{1}` inline'
    expect(convertFenceHighlightMeta(src)).toBe(src)
  })

  it('returns the input unchanged when there is no brace at all', () => {
    const src = '# Heading\n\n```js\nconst a = 1\n```\n'
    expect(convertFenceHighlightMeta(src)).toBe(src)
  })
})
