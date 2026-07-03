// @vitest-environment node
//
// Unit tests for the pure `wash` sponsor transform (lib/landing/sponsors.ts).
// Pure data — no fetch, no globals. Covers all five tier keys, the
// missing-websiteUrl -> github-login url, and empty / failed-fetch inputs.
//
// Run: GITHUB_TOKEN=dummy vp test run lib/landing/sponsors.test.ts
import { describe, it, expect } from 'vite-plus/test'
import { wash } from './sponsors.ts'

const raw = {
  specialThanks: [
    { login: 'voidzero-dev', name: 'VoidZero', avatarUrl: 'data:image/png;1' },
  ],
  platinum: [
    {
      login: 'github',
      name: 'GitHub',
      avatarUrl: 'data:image/png;2',
    },
  ],
  gold: [
    { login: 'gsoft-inc', name: 'Workleap', avatarUrl: 'data:image/png;3' },
  ],
  sliver: [{ login: 'nrwl', name: 'Nx', avatarUrl: 'data:image/png;4' }],
  backers: [
    { login: 'octocat', name: 'The Octocat', avatarUrl: 'data:image/png;5' },
  ],
}

describe('wash', () => {
  it('maps all five tier keys (incl. the `sliver` misspelling)', () => {
    const washed = wash(raw)
    expect(Object.keys(washed)).toEqual([
      'specialThanks',
      'platinum',
      'gold',
      'sliver',
      'backers',
    ])
    // The misspelled `sliver` key is preserved, NOT normalized to `silver`.
    expect(washed).toHaveProperty('sliver')
    expect(washed).not.toHaveProperty('silver')
    expect(washed.sliver[0].name).toBe('Nx')
  })

  it('maps avatarUrl -> img and name -> name per item', () => {
    const washed = wash(raw)
    expect(washed.specialThanks[0]).toEqual({
      name: 'VoidZero',
      img: 'data:image/png;1',
      url: 'https://github.com/voidzero-dev',
    })
    expect(washed.platinum[0].img).toBe('data:image/png;2')
    expect(washed.gold[0].name).toBe('Workleap')
    expect(washed.backers[0].img).toBe('data:image/png;5')
  })

  it('derives url from the github login (raw payload has no websiteUrl)', () => {
    const washed = wash(raw)
    expect(washed.gold[0].url).toBe('https://github.com/gsoft-inc')
    expect(washed.sliver[0].url).toBe('https://github.com/nrwl')
    expect(washed.backers[0].url).toBe('https://github.com/octocat')
    // Even when the upstream item carries a websiteUrl, the locked decision is
    // to always point at the github profile.
    const withWebsite = wash({
      gold: [
        {
          login: 'workleap',
          name: 'Workleap',
          avatarUrl: 'x',
          // websiteUrl is intentionally ignored — wash() takes `unknown`, and
          // the locked decision is to always derive the url from the login.
          websiteUrl: 'https://workleap.com',
        },
      ],
    })
    expect(withWebsite.gold[0].url).toBe('https://github.com/workleap')
  })

  it('returns all-empty tiers for an empty object', () => {
    expect(wash({})).toEqual({
      specialThanks: [],
      platinum: [],
      gold: [],
      sliver: [],
      backers: [],
    })
  })

  it('returns all-empty tiers for a failed fetch (null / undefined / non-object)', () => {
    const empty = {
      specialThanks: [],
      platinum: [],
      gold: [],
      sliver: [],
      backers: [],
    }
    expect(wash(null)).toEqual(empty)
    expect(wash(undefined)).toEqual(empty)
    expect(wash('boom')).toEqual(empty)
  })

  it('defaults missing individual tiers to empty arrays', () => {
    const washed = wash({ gold: raw.gold })
    expect(washed.gold).toHaveLength(1)
    expect(washed.specialThanks).toEqual([])
    expect(washed.platinum).toEqual([])
    expect(washed.sliver).toEqual([])
    expect(washed.backers).toEqual([])
  })
})
