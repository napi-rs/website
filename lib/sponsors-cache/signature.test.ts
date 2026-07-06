// @vitest-environment node
// lib/sponsors-cache/signature.test.ts
import { describe, it, expect } from 'vitest'
import { verifyGithubSignature } from './signature.ts'

// Build a valid GitHub-style signature header with Web Crypto (same as GitHub does).
async function sign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body),
  )
  const hex = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `sha256=${hex}`
}

describe('verifyGithubSignature', () => {
  const secret = 'topsecret'
  const body = '{"action":"created"}'

  it('accepts a correct signature', async () => {
    expect(
      await verifyGithubSignature(secret, body, await sign(secret, body)),
    ).toBe(true)
  })
  it('rejects a tampered body', async () => {
    expect(
      await verifyGithubSignature(secret, body + 'x', await sign(secret, body)),
    ).toBe(false)
  })
  it('rejects a wrong secret', async () => {
    expect(
      await verifyGithubSignature('other', body, await sign(secret, body)),
    ).toBe(false)
  })
  it('rejects missing / malformed headers', async () => {
    expect(await verifyGithubSignature(secret, body, undefined)).toBe(false)
    expect(await verifyGithubSignature(secret, body, 'sha1=abcd')).toBe(false)
    expect(await verifyGithubSignature(secret, body, 'sha256=zz')).toBe(false)
    expect(await verifyGithubSignature(secret, body, 'sha256=')).toBe(false)
  })
})
