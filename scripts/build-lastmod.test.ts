import { describe, expect, it } from 'vitest'

import {
  aggregateContributors,
  avatarForEmail,
  buildLastmodMap,
  renderLastmodJson,
  toContributor,
} from './build-lastmod.mjs'

describe('avatarForEmail', () => {
  it('maps id-prefixed noreply emails to the avatars host', () => {
    expect(avatarForEmail('12345+octocat@users.noreply.github.com')).toBe(
      'https://avatars.githubusercontent.com/u/12345?v=4',
    )
  })

  it('maps bare noreply emails to github.com/<user>.png', () => {
    expect(avatarForEmail('octocat@users.noreply.github.com')).toBe(
      'https://github.com/octocat.png',
    )
  })

  it('falls back to a gravatar identicon for non-noreply emails', () => {
    // md5('lynweklm@gmail.com') — gravatar's documented hashing scheme.
    expect(avatarForEmail('lynweklm@gmail.com')).toBe(
      'https://www.gravatar.com/avatar/b42cd0b382123d0dacf30aaa817ac3f3?d=identicon&s=64',
    )
    expect(avatarForEmail('')).toBeUndefined()
  })
})

describe('aggregateContributors', () => {
  it('counts commits per author email, most commits first', () => {
    // git log order: newest first.
    const lines = [
      'Alice|alice@users.noreply.github.com',
      'Bob|bob@users.noreply.github.com',
      'Alice|alice@users.noreply.github.com',
    ]
    const top = aggregateContributors(lines)
    expect(top.map((c) => [c.name, c.count])).toEqual([
      ['Alice', 2],
      ['Bob', 1],
    ])
  })

  it('breaks count ties by earliest first-commit first', () => {
    // Newest-first lines: Carol's only commit is OLDER than Dave's.
    const lines = [
      'Dave|dave@users.noreply.github.com',
      'Carol|carol@users.noreply.github.com',
    ]
    const top = aggregateContributors(lines)
    expect(top.map((c) => c.name)).toEqual(['Carol', 'Dave'])
  })

  it('caps at max and merges emails separately', () => {
    const lines = Array.from(
      { length: 12 },
      (_, i) => `P${i % 6}|p${i % 6}@x.com`,
    )
    expect(aggregateContributors(lines, 5)).toHaveLength(5)
    // same person, two emails -> two entries
    const two = aggregateContributors(['A|a@x.com', 'A|a2@x.com'])
    expect(two).toHaveLength(2)
  })

  it('ignores malformed lines', () => {
    expect(aggregateContributors(['no-separator', '|only-email'])).toEqual([
      expect.objectContaining({ name: '' }),
    ])
    expect(aggregateContributors(['trailing|'])).toEqual([])
  })
})

describe('toContributor', () => {
  it('includes avatar for noreply emails, gravatar fallback otherwise', () => {
    expect(
      toContributor({
        name: 'Octo',
        email: 'octocat@users.noreply.github.com',
      }),
    ).toEqual({
      name: 'Octo',
      avatar: 'https://github.com/octocat.png',
    })
    const withGravatar = toContributor({
      name: 'LongYinan',
      email: 'lynweklm@gmail.com',
    })
    expect(withGravatar.name).toBe('LongYinan')
    expect(withGravatar.avatar).toMatch(
      /^https:\/\/www\.gravatar\.com\/avatar\/[0-9a-f]{32}\?d=identicon&s=64$/,
    )
  })
})

describe('buildLastmodMap', () => {
  it('keys by unprefixed leaf and shapes entries per the contract', () => {
    const files = [
      'pages/en/docs/concepts/enum.md',
      'pages/en/blog/announce-v3.md',
    ]
    const gitInfo = (file: string) =>
      file.includes('enum')
        ? {
            lastmod: '2026-07-13T10:09:00+02:00',
            authorLines: [
              'Foo|123+foo@users.noreply.github.com',
              'Bar|bar@gmail.com',
            ],
          }
        : {
            lastmod: '2025-07-07T00:00:00+00:00',
            authorLines: [],
          }
    expect(buildLastmodMap(files, gitInfo)).toEqual({
      'docs/concepts/enum': {
        lastmod: '2026-07-13T10:09:00+02:00',
        contributors: [
          // 1 commit each: Bar's commit is older (later in newest-first log),
          // so the earliest-first-commit tie-break puts Bar first.
          {
            name: 'Bar',
            avatar:
              'https://www.gravatar.com/avatar/1f606794f250d44f206b4090176a5af2?d=identicon&s=64',
          },
          {
            name: 'Foo',
            avatar: 'https://avatars.githubusercontent.com/u/123?v=4',
          },
        ],
      },
      'blog/announce-v3': {
        lastmod: '2025-07-07T00:00:00+00:00',
        contributors: [],
      },
    })
  })

  it('skips files with no git history', () => {
    const map = buildLastmodMap(['pages/en/docs/new.md'], () => undefined)
    expect(map).toEqual({})
  })

  it('strips the locale prefix for every locale (per-locale generation)', () => {
    const gitInfo = () => ({
      lastmod: '2026-07-29T00:00:00+00:00',
      authorLines: [],
    })
    expect(
      buildLastmodMap(
        ['pages/cn/docs/concepts/enum.md', 'pages/pt-BR/docs/more/examples.md'],
        gitInfo,
      ),
    ).toEqual({
      'docs/concepts/enum': {
        lastmod: '2026-07-29T00:00:00+00:00',
        contributors: [],
      },
      'docs/more/examples': {
        lastmod: '2026-07-29T00:00:00+00:00',
        contributors: [],
      },
    })
  })
})

describe('renderLastmodJson', () => {
  it('is pretty 2-space JSON with a trailing newline', () => {
    const out = renderLastmodJson({ a: { lastmod: 'x', contributors: [] } })
    expect(out).toBe(
      '{\n  "a": {\n    "lastmod": "x",\n    "contributors": []\n  }\n}\n',
    )
  })
})
