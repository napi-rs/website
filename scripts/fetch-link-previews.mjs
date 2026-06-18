// scripts/fetch-link-previews.mjs
//
// Reproduces the legacy `getStaticProps` from
// legacy_pages/docs/concepts/webassembly.en.mdx and bakes its result into a
// committed JSON fixture: lib/docs/link-preview-data.json, keyed by href.
//
// Run: node scripts/fetch-link-previews.mjs
//
// The converted .md page (pages/en/docs/concepts/webassembly.md) is fully static
// — it has no getStaticProps — so the LinkPreview island reads its metadata from
// this fixture instead. Re-run this script only when the upstream issue/blog
// metadata changes; the JSON is committed so builds/tests are network-free.
//
// Each entry mirrors the legacy shape exactly:
//   { json: { title, body, user: { login }, repoUrl }, og, userAvatar }
// where `og` and `userAvatar` are RAW base64 (NO `data:` prefix) — link-preview.tsx
// prepends `data:image/png;base64,` at render time.

import { createHash } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outPath = join(root, 'lib', 'docs', 'link-preview-data.json')

const MOZILLA_HREF =
  'https://blog.mozilla.org/security/2018/01/03/mitigations-landing-new-class-timing-attack/'
const GITHUB_HREF = 'https://github.com/napi-rs/napi-rs/issues/1794'

/** GET a URL and return its body as RAW base64 (no data: prefix). */
async function fetchBase64(url, headers) {
  const res = await fetch(url, headers ? { headers } : undefined)
  if (!res.ok) {
    throw new Error(`fetch failed ${res.status} ${res.statusText}: ${url}`)
  }
  const bytes = await res.bytes()
  return Buffer.from(bytes).toString('base64')
}

async function main() {
  const data = {}

  // --- Mozilla entry: json fields hardcoded exactly as in the legacy source. ---
  data[MOZILLA_HREF] = {
    json: {
      title: 'Mitigations: Landing new class of timing attacks',
      body: 'Several recently-published research articles have demonstrated a new class of timing attacks (Meltdown and Spectre) that work on modern CPUs.  Our internal experiments confirm that it is possible to use similar techniques from Web content to read private information between different origins.',
      user: {
        login: 'Luke Wagner',
      },
      repoUrl: 'blog.mozilla.org',
    },
    og: await fetchBase64(
      'https://blog.mozilla.org/wp-content/blogs.dir/278/files/2021/02/moz_blog_header_som_002_1200x600.jpg',
    ),
    userAvatar: await fetchBase64(
      'https://avatars.githubusercontent.com/u/9660325?v=4',
    ),
  }

  // --- GitHub entry: pulled live from the public issue API. ---
  // Unauthenticated works with a User-Agent header; the token is attached ONLY
  // when GITHUB_TOKEN is set (CI), never required.
  const githubHeaders = { 'User-Agent': 'napi-rs-website' }
  if (process.env.GITHUB_TOKEN) {
    githubHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  const issueRes = await fetch(
    'https://api.github.com/repos/napi-rs/napi-rs/issues/1794',
    { headers: githubHeaders },
  )
  if (!issueRes.ok) {
    throw new Error(
      `GitHub issue fetch failed ${issueRes.status} ${issueRes.statusText}`,
    )
  }
  const issue = await issueRes.json()

  data[GITHUB_HREF] = {
    json: {
      title: issue.title,
      body: issue.body,
      user: {
        login: issue.user.login,
      },
      repoUrl: 'napi-rs/napi-rs',
    },
    og: await fetchBase64(
      `https://opengraph.githubassets.com/${createHash('sha256')
        .update(issue.updated_at)
        .digest('hex')}/napi-rs/napi-rs/issues/1794`,
    ),
    userAvatar: await fetchBase64(issue.user.avatar_url),
  }

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n', 'utf8')

  // Report.
  console.log(`Wrote ${outPath}`)
  for (const href of Object.keys(data)) {
    const e = data[href]
    console.log(`  ${href}`)
    console.log(
      `    og: ${e.og.length} b64 chars, userAvatar: ${e.userAvatar.length} b64 chars`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
