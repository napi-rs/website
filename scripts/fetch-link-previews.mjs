// scripts/fetch-link-previews.mjs
//
// Reproduces the legacy `getStaticProps` from
// content/docs/concepts/webassembly.en.mdx and bakes its result into a
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

// announce-v3 hrefs (rendered <LinkPreview /> cards in
// content/blog/announce-v3.en.mdx — see its getStaticProps).
const WASM_BINDGEN_HREF = 'https://github.com/rustwasm/wasm-bindgen/pull/2209'
const CROSS_TOOLCHAIN_HREF = 'https://github.com/napi-rs/cross-toolchain'
const NPM_ISSUE_HREF = 'https://github.com/npm/cli/issues/4828'
const TS_GO_DISCUSSION_HREF =
  'https://github.com/microsoft/typescript-go/discussions/455'

// Unauthenticated GitHub API works with a User-Agent header; GITHUB_TOKEN is
// attached ONLY when set (CI), never required. The legacy getStaticProps used a
// bare `Authorization: Bearer ${GITHUB_TOKEN}` — we keep that opt-in but add the
// UA so anonymous CI/local runs work too.
function githubHeaders() {
  const headers = { 'User-Agent': 'napi-rs-website' }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  return headers
}

/**
 * GET a URL and return its body as RAW base64 (no data: prefix). The
 * `opengraph.githubassets.com` CDN aggressively rate-limits (429) anonymous
 * bursts, so retry transient 429/5xx responses with exponential backoff. A
 * User-Agent header is always sent (the CDN is happier with one).
 */
async function fetchBase64(url, headers) {
  const merged = { 'User-Agent': 'napi-rs-website', ...headers }
  const maxAttempts = 6
  let lastStatus = ''
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, { headers: merged })
    if (res.ok) {
      const bytes = await res.bytes()
      return Buffer.from(bytes).toString('base64')
    }
    lastStatus = `${res.status} ${res.statusText}`
    // Retry only on transient failures; fail fast on 4xx that won't recover.
    if (res.status !== 429 && res.status < 500) break
    const delayMs = Math.min(1000 * 2 ** attempt, 15000)
    await new Promise((r) => setTimeout(r, delayMs))
  }
  throw new Error(`fetch failed ${lastStatus}: ${url}`)
}

/** GET a GitHub API URL and return parsed JSON, throwing with context on error. */
async function fetchGithubJson(url) {
  const res = await fetch(url, { headers: githubHeaders() })
  if (!res.ok) {
    throw new Error(
      `GitHub fetch failed ${res.status} ${res.statusText}: ${url}`,
    )
  }
  return res.json()
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
  const issue = await fetchGithubJson(
    'https://api.github.com/repos/napi-rs/napi-rs/issues/1794',
  )

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

  // --- announce-v3 entries: reproduce content/blog/announce-v3.en.mdx's
  // getStaticProps EXACTLY. The og-image URL scheme differs per source:
  //   • wasm-bindgen PR: og hash = the PR head SHA (NOT a sha256 of updated_at)
  //   • cross-toolchain repo / npm issue / typescript-go discussion:
  //     og hash = sha256(updated_at)
  // and each card pulls its json fields from a different API shape (PR vs repo
  // vs issue vs discussion). ---

  // wasm-bindgen PR #2209: title/body/user from the PR, repoUrl from base.repo,
  // og keyed by the PR HEAD SHA.
  const wasmBindgen = await fetchGithubJson(
    'https://api.github.com/repos/rustwasm/wasm-bindgen/pulls/2209',
  )
  data[WASM_BINDGEN_HREF] = {
    json: {
      title: wasmBindgen.title,
      user: { login: wasmBindgen.user.login },
      body: wasmBindgen.body,
      repoUrl: `${wasmBindgen.base.repo.owner.login}/${wasmBindgen.base.repo.name}`,
    },
    og: await fetchBase64(
      `https://opengraph.githubassets.com/${wasmBindgen.head.sha}/rustwasm/wasm-bindgen/pull/2209`,
    ),
    userAvatar: await fetchBase64(wasmBindgen.user.avatar_url),
  }

  // napi-rs/cross-toolchain repo: title=name, login=owner.login, body=description,
  // repoUrl=full_name, og keyed by sha256(updated_at), avatar=organization.avatar_url.
  const crossToolchain = await fetchGithubJson(
    'https://api.github.com/repos/napi-rs/cross-toolchain',
  )
  data[CROSS_TOOLCHAIN_HREF] = {
    json: {
      title: crossToolchain.name,
      user: { login: crossToolchain.owner.login },
      body: crossToolchain.description,
      repoUrl: crossToolchain.full_name,
    },
    og: await fetchBase64(
      `https://opengraph.githubassets.com/${createHash('sha256')
        .update(crossToolchain.updated_at)
        .digest('hex')}/napi-rs/cross-toolchain`,
    ),
    userAvatar: await fetchBase64(crossToolchain.organization.avatar_url),
  }

  // npm/cli issue #4828: repoUrl hardcoded 'npm/cli/issues/4828',
  // og keyed by sha256(updated_at).
  const npmIssue = await fetchGithubJson(
    'https://api.github.com/repos/npm/cli/issues/4828',
  )
  data[NPM_ISSUE_HREF] = {
    json: {
      title: npmIssue.title,
      user: { login: npmIssue.user.login },
      body: npmIssue.body,
      repoUrl: 'npm/cli/issues/4828',
    },
    og: await fetchBase64(
      `https://opengraph.githubassets.com/${createHash('sha256')
        .update(npmIssue.updated_at)
        .digest('hex')}/npm/cli/issues/4828`,
    ),
    userAvatar: await fetchBase64(npmIssue.user.avatar_url),
  }

  // microsoft/typescript-go discussion #455: repoUrl hardcoded 'microsoft/typescript-go',
  // og keyed by sha256(updated_at).
  const tsGoDiscussion = await fetchGithubJson(
    'https://api.github.com/repos/microsoft/typescript-go/discussions/455',
  )
  data[TS_GO_DISCUSSION_HREF] = {
    json: {
      title: tsGoDiscussion.title,
      user: { login: tsGoDiscussion.user.login },
      body: tsGoDiscussion.body,
      repoUrl: 'microsoft/typescript-go',
    },
    og: await fetchBase64(
      `https://opengraph.githubassets.com/${createHash('sha256')
        .update(tsGoDiscussion.updated_at)
        .digest('hex')}/microsoft/typescript-go/discussions/455`,
    ),
    userAvatar: await fetchBase64(tsGoDiscussion.user.avatar_url),
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
