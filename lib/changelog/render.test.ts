// @vitest-environment node
//
// Unit tests for the pure changelog build + render (lib/changelog/render.ts).
// No network: feeds a hand-built releases fixture (matching + non-matching
// names, a body with `&#39;`, @mentions, and a code fence) and asserts the
// legacy filter/transform 1:1 plus the option-A renderer markup (shiki fence +
// header anchors).
//
// Run: GITHUB_TOKEN=dummy vp test run lib/changelog/render.test.ts
import { describe, it, expect } from 'vite-plus/test'
import {
  buildChangelogMarkdown,
  renderChangelogHtml,
  type GitHubRelease,
} from './render.ts'

// --- Fixtures --------------------------------------------------------------

const RELEASES: GitHubRelease[] = [
  {
    // matches `napi` — body exercises &#39;, an @mention, and a code fence.
    name: 'napi@3.0.0',
    tag_name: 'napi@3.0.0',
    html_url: 'https://github.com/napi-rs/napi-rs/releases/tag/napi%403.0.0',
    published_at: '2024-01-15T00:00:00Z',
    body: 'It&#39;s here, thanks @Brooklyn and @octo-cat, here&#39;s how:\n\n```rust\nfn main() {}\n```\n',
  },
  {
    // also matches `napi` (second, ordered after the first).
    name: 'napi@2.16.0',
    tag_name: 'napi@2.16.0',
    html_url: 'https://github.com/napi-rs/napi-rs/releases/tag/napi%402.16.0',
    published_at: '2023-06-01T00:00:00Z',
    body: 'Older release.',
  },
  {
    // `napi-derive@*` — its name DOES start with `napi`, so the legacy `napi`
    // filter over-matches it (a faithfully-replicated quirk of `startsWith`).
    // It is excluded ONLY by the `napi-derive` filter string's own page.
    name: 'napi-derive@3.0.0',
    tag_name: 'napi-derive@3.0.0',
    html_url:
      'https://github.com/napi-rs/napi-rs/releases/tag/napi-derive%403.0.0',
    published_at: '2024-02-01T00:00:00Z',
    body: 'Derive release.',
  },
  {
    // @napi-rs/cli release — name does NOT start with `napi`, so it is excluded
    // from every crate page and included only by the `@napi-rs/cli` filter.
    name: '@napi-rs/cli@3.0.0',
    tag_name: '@napi-rs/cli@3.0.0',
    html_url: 'https://github.com/napi-rs/napi-rs/releases/tag/cli%403.0.0',
    published_at: '2024-03-01T00:00:00Z',
    body: 'CLI release.',
  },
  {
    // A wholly unrelated release name — excluded from every package filter.
    name: 'oxc@1.0.0',
    tag_name: 'oxc@1.0.0',
    html_url: 'https://github.com/napi-rs/napi-rs/releases/tag/oxc%401.0.0',
    published_at: '2024-05-01T00:00:00Z',
    body: 'Unrelated release.',
  },
  {
    // no name -> never matches, and must not throw.
    name: null,
    tag_name: 'untagged',
    html_url: 'https://github.com/napi-rs/napi-rs/releases',
    published_at: '2024-04-01T00:00:00Z',
    body: 'Draft.',
  },
]

// --- buildChangelogMarkdown ------------------------------------------------

describe('buildChangelogMarkdown', () => {
  it('filters releases by name.startsWith(packageName)', async () => {
    const md = await buildChangelogMarkdown(RELEASES, 'napi', 'en')
    // Both `napi@*` releases are present; only names NOT starting with `napi`
    // are excluded (`@napi-rs/cli@*`, `oxc@*`, null-named).
    expect(md).toContain('napi@3.0.0')
    expect(md).toContain('napi@2.16.0')
    expect(md).not.toContain('CLI release.')
    expect(md).not.toContain('Unrelated release.')
    expect(md).not.toContain('Draft.')
  })

  it('replicates the legacy startsWith over-match (`napi` page includes `napi-derive@*`)', async () => {
    // FAITHFUL legacy quirk: `'napi-derive@3.0.0'.startsWith('napi')` is true,
    // so the `napi` page historically included napi-derive/sys/build releases.
    const md = await buildChangelogMarkdown(RELEASES, 'napi', 'en')
    expect(md).toContain('Derive release.')
    // The narrower `napi-derive` filter does NOT match plain `napi@*`.
    const derive = await buildChangelogMarkdown(RELEASES, 'napi-derive', 'en')
    expect(derive).toContain('Derive release.')
    expect(derive).not.toContain('Older release.')
  })

  it('prepends a top-level H1 with the package name', async () => {
    const md = await buildChangelogMarkdown(RELEASES, 'napi', 'en')
    expect(md.startsWith('# napi\n\n')).toBe(true)
  })

  it('emits each release as an H2 anchor (html_url, target/rel) to the tag', async () => {
    const md = await buildChangelogMarkdown(RELEASES, 'napi', 'en')
    expect(md).toContain(
      '## <a href="https://github.com/napi-rs/napi-rs/releases/tag/napi%403.0.0" target="_blank" rel="noopener">napi@3.0.0</a>',
    )
  })

  it('decodes &#39; to a plain apostrophe in the body', async () => {
    const md = await buildChangelogMarkdown(RELEASES, 'napi', 'en')
    expect(md).toContain("It's here")
    expect(md).toContain("here's how")
    expect(md).not.toContain('&#39;')
  })

  it('rewrites @mentions (followed by , or space) into GitHub profile links', async () => {
    const md = await buildChangelogMarkdown(RELEASES, 'napi', 'en')
    expect(md).toContain('[@Brooklyn](https://github.com/Brooklyn)')
    expect(md).toContain('[@octo-cat](https://github.com/octo-cat)')
  })

  it('preserves release order and joins blocks with a blank line', async () => {
    const md = await buildChangelogMarkdown(RELEASES, 'napi', 'en')
    const first = md.indexOf('napi@3.0.0')
    const second = md.indexOf('napi@2.16.0')
    expect(first).toBeGreaterThan(-1)
    expect(second).toBeGreaterThan(first)
    // Two blocks -> exactly one block separator between them.
    expect(md).toContain(
      '\n\n## <a href="https://github.com/napi-rs/napi-rs/releases/tag/napi%402.16.0"',
    )
  })

  it('uses the @napi-rs/cli filter string for the CLI package only', async () => {
    const md = await buildChangelogMarkdown(RELEASES, '@napi-rs/cli', 'en')
    expect(md).toContain('CLI release.')
    expect(md).not.toContain('napi@3.0.0')
  })

  it('does not throw on a release with no body / null name', async () => {
    const md = await buildChangelogMarkdown(RELEASES, 'untagged', 'en')
    // `untagged` name is null on the only release with that tag -> no match.
    expect(md).toBe('# untagged\n\n')
  })
})

// --- renderChangelogHtml (option A: shiki + anchors) -----------------------

describe('renderChangelogHtml', () => {
  it('renders an H2 release anchor as HTML linking to the release', async () => {
    const md = await buildChangelogMarkdown(RELEASES, 'napi', 'en')
    const html = await renderChangelogHtml(md)
    expect(html).toContain(
      '<a href="https://github.com/napi-rs/napi-rs/releases/tag/napi%403.0.0" target="_blank" rel="noopener">napi@3.0.0</a>',
    )
  })

  it('emits header anchors on headings (markdown-it-anchor)', async () => {
    const md = await buildChangelogMarkdown(RELEASES, 'napi', 'en')
    const html = await renderChangelogHtml(md)
    expect(html).toContain('class="header-anchor"')
  })

  it('renders an @mention as a GitHub profile link', async () => {
    const md = await buildChangelogMarkdown(RELEASES, 'napi', 'en')
    const html = await renderChangelogHtml(md)
    expect(html).toContain('href="https://github.com/Brooklyn"')
  })

  it('highlights a code fence into .language-* / shiki markup (option A)', async () => {
    const html = await renderChangelogHtml('```rust\nfn main() {}\n```\n')
    expect(html).toContain('class="language-rust')
    expect(html).toContain('shiki')
  })
})
