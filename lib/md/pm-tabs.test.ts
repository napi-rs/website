// @vitest-environment node
//
// Unit test for the `::: pm` -> package-manager-tabs rewrite used by the Vite
// pre-transform in vite.config.ts. See lib/md/pm-tabs.ts for why.
import { describe, it, expect } from 'vite-plus/test'
import { transformPmTabs } from './pm-tabs.ts'

const BASIC = [
  '::: pm',
  '```bash npm',
  'npx napi build',
  '```',
  '```bash yarn',
  'yarn napi build',
  '```',
  ':::',
].join('\n')

describe('transformPmTabs', () => {
  it('rewrites a basic npm/yarn block into synced tab markup', () => {
    const out = transformPmTabs(BASIC)
    expect(out).toBe(
      [
        '<div class="pm-tabs">',
        '<input type="radio" class="pm-input" name="pm-pm1" value="npm" id="pm-pm1-npm"><label for="pm-pm1-npm" data-pm-default>npm</label>',
        '<input type="radio" class="pm-input" name="pm-pm1" value="yarn" id="pm-pm1-yarn"><label for="pm-pm1-yarn">yarn</label>',
        '<div class="pm-panel" data-pm="npm" data-pm-default>',
        '',
        '```bash',
        'npx napi build',
        '```',
        '',
        '</div>',
        '<div class="pm-panel" data-pm="yarn">',
        '',
        '```bash',
        'yarn napi build',
        '```',
        '',
        '</div>',
        '</div>',
      ].join('\n'),
    )
  })

  it('strips the pm keyword but keeps the rest of the info string', () => {
    const out = transformPmTabs(
      ['::: pm', '```bash title="Install" npm', 'npm i x', '```', ':::'].join(
        '\n',
      ),
    )
    expect(out).toContain('```bash title="Install"\n')
    expect(out).not.toContain('npm\nnpm i x')
  })

  it('labels appear in order of FIRST appearance (not canonical order)', () => {
    const out = transformPmTabs(
      [
        '::: pm',
        '```bash pnpm',
        'pnpm add x',
        '```',
        '```bash npm',
        'npm i x',
        '```',
        ':::',
      ].join('\n'),
    )
    const pnpmIdx = out.indexOf('value="pnpm"')
    const npmIdx = out.indexOf('value="npm"')
    expect(pnpmIdx).toBeGreaterThan(-1)
    expect(npmIdx).toBeGreaterThan(pnpmIdx)
  })

  it('gives each block its OWN radio-group name + uid (a11y: per-bar groups)', () => {
    const out = transformPmTabs(`${BASIC}\n\ntext\n\n${BASIC}`)
    // Two blocks × two radios each: names are per-block (pm-pm1 / pm-pm2), so
    // each visual tab bar is a standalone radio group; cross-bar sync is JS.
    expect(out.match(/name="pm-pm1"/g)).toHaveLength(2)
    expect(out.match(/name="pm-pm2"/g)).toHaveLength(2)
    expect(out).not.toContain('name="pm"')
    expect(out).toContain('id="pm-pm1-npm"')
    expect(out).toContain('id="pm-pm2-npm"')
  })

  it('a keyword-less fence joins the PREVIOUS panel', () => {
    const out = transformPmTabs(
      [
        '::: pm',
        '```bash npm',
        'npm i x',
        '```',
        '```bash',
        'echo extra',
        '```',
        ':::',
      ].join('\n'),
    )
    // Only ONE panel (npm) holding both fences; no stray label for the
    // keyword-less fence.
    expect(out.match(/class="pm-panel"/g)).toHaveLength(1)
    expect(out).toContain('```bash\necho extra\n```')
    const panel = out.slice(
      out.indexOf('data-pm="npm"'),
      out.indexOf('</div>\n</div>'),
    )
    expect(panel).toContain('npm i x')
    expect(panel).toContain('echo extra')
  })

  it('is idempotent: transformed input passes through unchanged', () => {
    const once = transformPmTabs(BASIC)
    expect(transformPmTabs(once)).toBe(once)
  })

  it('returns input unchanged when there is no ::: pm block', () => {
    const src = '# Hi\n\n```bash npm\nnpm i x\n```\n'
    expect(transformPmTabs(src)).toBe(src)
  })

  it('tolerates up to 3 spaces of indentation on the container fences', () => {
    const out = transformPmTabs(
      ['  ::: pm', '  ```bash npm', '  npm i x', '  ```', '  :::'].join('\n'),
    )
    expect(out).toContain('class="pm-tabs"')
    expect(out).toContain('data-pm="npm"')
  })

  it('is CRLF safe', () => {
    const out = transformPmTabs(BASIC.replaceAll('\n', '\r\n'))
    expect(out).toContain('data-pm="npm"')
    expect(out).toContain('```bash\r\nnpx napi build\r\n```')
    expect(out).not.toContain(' npm\r')
  })

  it('drops an empty block (no pm fences) instead of emitting an empty tab bar', () => {
    const out = transformPmTabs('::: pm\nno fences here\n:::')
    expect(out).toBe('')
  })

  it('tolerates an unterminated block (EOF before :::)', () => {
    const out = transformPmTabs('::: pm\n```bash bun\nbun add x\n```')
    expect(out).toContain('data-pm="bun"')
    expect(out).toContain('```bash\nbun add x\n```')
  })

  it('supports all four package managers', () => {
    const out = transformPmTabs(
      [
        '::: pm',
        '```sh npm',
        'a',
        '```',
        '```sh yarn',
        'b',
        '```',
        '```sh pnpm',
        'c',
        '```',
        '```sh bun',
        'd',
        '```',
        ':::',
      ].join('\n'),
    )
    for (const pm of ['npm', 'yarn', 'pnpm', 'bun']) {
      expect(out).toContain(`value="${pm}"`)
      expect(out).toContain(`data-pm="${pm}"`)
    }
  })
})
