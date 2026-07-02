// EditOnGithub — STATIC "edit this page on GitHub" link.
//
// Rendered as a slot prop of DocsLayout below the pager; NOT an island.
//
// Source path derivation: the NEW markdown source for a docs page lives at
//   pages/<locale>/<leafPath>.md
// e.g. pages/en/docs/concepts/enum.md, pages/cn/docs/concepts/enum.md.
// `leafPath` (the section-qualified, unprefixed remainder, e.g.
// `docs/concepts/enum`) comes from splitLocale(useRouter().path)[1] — the same
// value the breadcrumb/pager use. We point the link at the repo's blob/main
// tree: https://github.com/napi-rs/website/blob/main/pages/<locale>/<leaf>.md
import { ExternalLink } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/nav/index.ts'
import { splitLocale } from '@/lib/docs/locale.ts'
import { useRouter } from '@void/react'

export interface EditOnGithubProps {
  locale: Locale
  /**
   * Current ROUTE path. Static components are SSR-only (no client router), so
   * the layout passes the path resolved from `useShared().path`. Falls back to
   * `useRouter().path` when omitted.
   */
  currentPath?: string
  className?: string
}

const EDIT_BASE = 'https://github.com/napi-rs/website/blob/main'

const LABEL: Record<Locale, string> = {
  en: 'Edit this page on GitHub →',
  cn: '在 GitHub 上编辑本页 →',
  'pt-BR': 'Editar essa página no Github →',
}

export default function EditOnGithub({
  locale,
  currentPath,
  className,
}: EditOnGithubProps) {
  const router = useRouter()
  const path = currentPath ?? router.path
  const [, rest] = splitLocale(path)

  // No resolvable source path (e.g. a non-docs route) — render nothing.
  if (!rest) return null

  const sourcePath = `pages/${locale}/${rest}.md`
  const href = `${EDIT_BASE}/${sourcePath}`

  return (
    <div className={cn('mt-8 text-sm', className)}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
      >
        <ExternalLink className="size-3.5" aria-hidden="true" />
        {LABEL[locale]}
      </a>
    </div>
  )
}
