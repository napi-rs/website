// lib/sponsors-cache/signature.ts
// Verify a GitHub webhook X-Hub-Signature-256 header: HMAC-SHA256 of the RAW
// request body, hex, prefixed "sha256=". crypto.subtle.verify is constant-time.

export async function verifyGithubSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null | undefined,
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  const sigBytes = hexToBytes(signatureHeader.slice('sha256='.length))
  if (!sigBytes) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  return crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(rawBody),
  )
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex))
    return null
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}
