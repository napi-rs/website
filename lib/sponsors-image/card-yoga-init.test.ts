// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

// Force satori's init to reject once, then succeed, to prove ensureYoga retries.
vi.mock('satori/standalone', () => {
  let calls = 0
  return {
    default: vi.fn(),
    init: vi.fn(async () => {
      calls += 1
      if (calls === 1) throw new Error('yoga boom')
    }),
  }
})

import { ensureYoga } from './card.ts'

describe('ensureYoga', () => {
  it('clears its cached promise on a rejected init so a later call retries', async () => {
    const fakeModule = {} as WebAssembly.Module
    await expect(ensureYoga(fakeModule)).rejects.toThrow('yoga boom')
    await expect(ensureYoga(fakeModule)).resolves.toBeUndefined()
  })
})
