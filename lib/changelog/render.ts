// Changelog markdown build + render — PURE (no env, no network).
//
// Two concerns, both unit-testable in isolation:
//
//   1. buildChangelogMarkdown(releases, packageName, locale) — replicate the
//      legacy components/changelog-generator.js transform EXACTLY (filter by
//      `name.startsWith(packageName)`, per-release H2 anchor block + localized
//      date + body, `&#39;` -> `'`, @-mention -> markdown link, joined by a
//      blank line). The only addition: a top-level `# <displayTitle>` H1, which
//      the legacy `.mdx` carried as literal markup ABOVE `<RemoteContent/>`
//      (release bodies start at H2), so the rendered page keeps its page title.
//
//   2. renderChangelogHtml(markdown) — compile markdown -> HTML. RENDERER:
//      option A — instantiate `markdown-exit` directly and mirror @void/md's
//      compile config (shiki fence highlighter + header anchors + linkify) for
//      visual parity with docs pages: the same `.language-*` / `pre.shiki`
//      markup the @void/md content theme (.void-md, imported by DocsLayout)
//      already styles. markdown-exit is resolved via a normal package import
//      (a direct dependency), NOT a deep-import of @void/md's hashed compile
//      module.
//
// Both functions are async so option A's async shiki fence rule (and a possible
// option-B swap) is transparent to callers.

import MarkdownExit from 'markdown-exit'
import anchor from 'markdown-it-anchor'
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'
import { bundledLanguages, createHighlighter, isSpecialLang } from 'shiki'

/** Minimal shape of a GitHub release we depend on (structural typing). */
export interface GitHubRelease {
  name?: string | null
  body?: string | null
  html_url?: string | null
  tag_name?: string | null
  published_at?: string | null
}

/**
 * Build the changelog markdown for one package from a flat list of GitHub
 * releases. Mirrors the legacy getChangelog transform 1:1:
 *
 *   • keep only releases whose `name` starts with `packageName`
 *   • per release, emit an H2 whose text is an anchor linking to the release
 *     (`<a href=html_url target=_blank rel=noopener>tag_name</a>`), then the
 *     locale-formatted published date, then the release body
 *   • body: `&#39;` -> `'`, then `@mention` (followed by `,` or space) -> a
 *     GitHub profile link
 *   • blocks joined by a blank line
 *
 * Prepends a top-level `# <displayTitle>` H1 (release bodies start at H2; the
 * legacy `.mdx` had the H1 as literal markup above `<RemoteContent/>`).
 */
export async function buildChangelogMarkdown(
  releases: ReadonlyArray<GitHubRelease>,
  packageName: string,
  locale = 'en',
): Promise<string> {
  const releasesMarkdown = releases
    .filter((r) => typeof r.name === 'string' && r.name.startsWith(packageName))
    .map((release) => {
      const body = (release.body ?? '')
        .replace(/&#39;/g, "'")
        .replace(/@([a-zA-Z0-9_-]+)(?=(,| ))/g, '[@$1](https://github.com/$1)')
      const date = release.published_at
        ? new Date(release.published_at).toLocaleDateString(locale)
        : ''
      return `## <a href="${release.html_url ?? ''}" target="_blank" rel="noopener">${release.tag_name ?? ''}</a>
  ${date} \n${body}`
    })
    .join('\n\n')

  return `# ${packageName}\n\n${releasesMarkdown}`
}

// --- markdown-exit compiler (option A: mirror @void/md's compile config) -----
//
// Lazily built + memoised so the shiki highlighter (the expensive part) is
// created once per worker isolate. Mirrors node_modules/@void/md compile.ts:
// `new MarkdownExit({ html, linkify })`, github-light/dark shiki themes, an
// async fence rule that lazy-loads bundled languages (falling back to `text`),
// the `.language-*` pre-wrapper, and header anchors. The shiki `langs` set
// matches vite.config.ts's voidMarkdown({ shiki: { langs } }) so changelog code
// fences highlight the same languages docs pages do.

const SHIKI_LANGS = [
  'rust',
  'toml',
  'bash',
  'json',
  'js',
  'jsx',
  'ts',
  'tsx',
  'diff',
  'yaml',
] as const

const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const

type Compiler = InstanceType<typeof MarkdownExit>

let compilerPromise: Promise<Compiler> | null = null

function extractLang(info: string): string {
  return (
    /^[a-zA-Z0-9-_]+/
      .exec(info)?.[0]
      .replace(/-vue$/, '')
      .replace(/^vue-html$/, 'template')
      .replace(/^ansi$/, '') || ''
  )
}

async function createCompiler(): Promise<Compiler> {
  const markdown = new MarkdownExit({ html: true, linkify: true })

  const highlighter = await createHighlighter({
    engine: createJavaScriptRegexEngine(),
    themes: [SHIKI_THEMES.light, SHIKI_THEMES.dark],
    langs: [...SHIKI_LANGS],
  })

  // Highlighted fence (mirrors @void/md): pick the first info token as the lang,
  // lazy-load it if it is a known bundled language, otherwise fall back to text.
  markdown.renderer.rules.fence = async (tokens, tokenIndex) => {
    const token = tokens[tokenIndex]
    const code = token.content
    let lang = token.info ? token.info.split(/\s+/g)[0] : 'text'
    if (
      !isSpecialLang(lang) &&
      !highlighter.getLoadedLanguages().includes(lang)
    ) {
      if (lang in bundledLanguages)
        await highlighter.loadLanguage(lang as keyof typeof bundledLanguages)
      else lang = 'text'
    }
    return highlighter.codeToHtml(code, {
      lang,
      themes: SHIKI_THEMES,
      defaultColor: 'light',
    })
  }

  // `.language-*` wrapper + lang label + copy button (mirrors @void/md's
  // preWrapper) so .void-md/code.css styles changelog fences like docs fences.
  const fence = markdown.renderer.rules.fence
  markdown.renderer.rules.fence = async (...args) => {
    const [tokens, idx] = args
    const token = tokens[idx]
    token.info = token.info.replace(/\[.*\]/, '')
    const active = / active( |$)/.test(token.info) ? ' active' : ''
    token.info = token.info.replace(/ active$/, '').replace(/ active /, ' ')
    const lang = extractLang(token.info)
    const highlighted = await fence(...args)
    return (
      `<div class="language-${lang}${active}"><button title="Copy Code" class="copy"></button><span class="lang">${lang}</span>` +
      highlighted +
      `</div>`
    )
  }

  markdown.use(anchor, {
    permalink: anchor.permalink.ariaHidden({ placement: 'before' }),
  })

  return markdown
}

function getCompiler(): Promise<Compiler> {
  if (!compilerPromise) compilerPromise = createCompiler()
  return compilerPromise
}

/** Compile changelog markdown to HTML (option A: shiki fences + anchors). */
export async function renderChangelogHtml(markdown: string): Promise<string> {
  const compiler = await getCompiler()
  return compiler.renderAsync(markdown)
}
