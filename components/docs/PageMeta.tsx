// PageMeta — STATIC page-metadata row under the pager: "Last updated", the
// contributor avatar stack, 👍/👎 feedback links, and the edit-on-GitHub link
// (kept here so DocsLayout's `editOnGithub` slot still carries it below xl,
// where the right-rail Toc with its own edit link is hidden).
//
// NOT an island — pure SSR from build-time data. The data source is the
// GENERATED lib/docs/lastmod.gen.json ({ leaf: { lastmod, contributors[] } }),
// keyed by the UNPREFIXED leaf (docs/… or blog/…). The generator script emits
// it at build time; a `{}` placeholder keeps the import resolvable in dev
// before the first generation, in which case the lastmod/contributors simply
// don't render.
import { ExternalLink, ThumbsDown, ThumbsUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/nav/index.ts'
import { htmlLang, splitLocale } from '@/lib/docs/locale.ts'
import { useRouter } from '@void/react'
import lastmodData from '@/lib/docs/lastmod.gen.json'

export interface PageMetaProps {
  /**
   * CONTENT locale (the locale of the rendered markdown). Drives label
   * localization AND the lastmod lookup: the generated map is per-locale, so
   * a retranslated page shows its own translation history.
   */
  locale: Locale
  /** Current ROUTE path (static components get it from useShared().path). */
  currentPath?: string
  className?: string
}

interface LastmodEntry {
  lastmod?: string
  contributors?: Array<{ name: string; avatar?: string }>
}

// The generated map is per-locale ({ en: { leaf: entry }, cn: … }) and `{}`
// until the build generator runs; cast through the structural shape so a
// missing leaf is just `undefined`.
const LASTMOD = lastmodData as unknown as Record<
  string,
  Record<string, LastmodEntry>
>

// Edit-on-GitHub source path: the markdown lives at pages/<locale>/<leaf>.md.
// Uses /edit/main (GitHub's editor) rather than /blob/main so the link opens
// the page ready to edit — one click fewer for contributors.
const EDIT_BASE = 'https://github.com/napi-rs/website/edit/main'

const LAST_UPDATED: Record<Locale, string> = {
  en: 'Last updated on',
  cn: '最后更新于',
  'pt-BR': 'Última atualização em',
}

const EDIT_LABEL: Record<Locale, string> = {
  en: 'Edit this page on GitHub →',
  cn: '在 GitHub 上编辑本页 →',
  'pt-BR': 'Editar essa página no Github →',
}

const FEEDBACK_POSITIVE: Record<Locale, string> = {
  en: 'This page was helpful',
  cn: '本页面对我有帮助',
  'pt-BR': 'Esta página foi útil',
}

const FEEDBACK_NEGATIVE: Record<Locale, string> = {
  en: 'This page needs improvement',
  cn: '本页面需要改进',
  'pt-BR': 'Esta página precisa de melhorias',
}

/** Prefilled GitHub "feedback" issue URL for a 👍/👎 rating. */
function feedbackUrl(path: string, rating: 'positive' | 'negative'): string {
  const params = new URLSearchParams({
    labels: 'feedback',
    title: `Feedback for ${path}`,
    body: `Page: ${path}\nRating: ${rating}\n\n`,
  })
  return `https://github.com/napi-rs/website/issues/new?${params.toString()}`
}

export default function PageMeta({
  locale,
  currentPath,
  className,
}: PageMetaProps) {
  const router = useRouter()
  const path = currentPath ?? router.path
  const [, rest] = splitLocale(path)

  // No resolvable source leaf (e.g. a non-docs route) — render nothing.
  if (!rest) return null

  // Per-locale entry, falling back to en (the content actually rendered on
  // i18n-fallback pages is English).
  const entry = LASTMOD[locale]?.[rest] ?? LASTMOD.en?.[rest]
  const lastmod = entry?.lastmod ? new Date(entry.lastmod) : null
  // Only contributors with a resolvable avatar render (defensive: older
  // lastmod.gen.json versions omitted `avatar` for non-noreply emails).
  const contributors = (entry?.contributors ?? [])
    .filter((c) => c.avatar)
    .slice(0, 5)

  return (
    <div
      className={cn(
        'mt-8 flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground',
        className,
      )}
    >
      {/* Last-updated + contributors (only when the generated data covers this
          leaf — changelog/landing have no entry and skip both). */}
      {lastmod || contributors.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {lastmod ? (
            <span>
              {LAST_UPDATED[locale]}{' '}
              <time dateTime={entry!.lastmod}>
                {new Intl.DateTimeFormat(htmlLang(locale), {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }).format(lastmod)}
              </time>
            </span>
          ) : null}
          {contributors.length > 0 ? (
            <div className="flex -space-x-2">
              {contributors.map((c) => (
                <img
                  key={c.name}
                  src={c.avatar}
                  alt={c.name}
                  title={c.name}
                  loading="lazy"
                  className="size-6 rounded-full ring-2 ring-background"
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* Feedback — plain links (no JS): each prefills a GitHub issue with
            the rating + page, the zero-JS way to collect 👍/👎. */}
        <div className="flex items-center gap-3">
          <a
            href={feedbackUrl(path, 'positive')}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={FEEDBACK_POSITIVE[locale]}
            title={FEEDBACK_POSITIVE[locale]}
            className="inline-flex items-center gap-1 transition-colors hover:text-primary"
          >
            <ThumbsUp className="size-3.5" aria-hidden="true" />
          </a>
          <a
            href={feedbackUrl(path, 'negative')}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={FEEDBACK_NEGATIVE[locale]}
            title={FEEDBACK_NEGATIVE[locale]}
            className="inline-flex items-center gap-1 transition-colors hover:text-primary"
          >
            <ThumbsDown className="size-3.5" aria-hidden="true" />
          </a>
        </div>

        {/* Edit on GitHub — same derivation as the Toc footer link. Hidden at
            xl+, where the right-rail Toc already carries an edit link. */}
        <a
          href={`${EDIT_BASE}/pages/${locale}/${rest}.md`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-primary xl:hidden"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          {EDIT_LABEL[locale]}
        </a>
      </div>
    </div>
  )
}
