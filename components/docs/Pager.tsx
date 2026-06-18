// Pager — STATIC prev/next navigation across the flattened section sidebar.
//
// Rendered as a slot prop of DocsLayout below the markdown body; NOT an island.
// Uses getPagerLinksCore (which flattens the whole section's sidebar groups in
// display order and returns locale-correct hrefs) and plain <a> anchors.
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { nav } from '@/lib/nav/index.ts'
import type { Locale } from '@/lib/nav/index.ts'
import { splitLocale } from '@/lib/docs/locale.ts'
import { getPagerLinksCore } from '@/lib/docs/page-data.ts'
import { useRouter } from '@void/react'

export interface PagerProps {
  locale: Locale
  /**
   * Current ROUTE path. Static components are SSR-only (no client router), so
   * the layout passes the path resolved from `useShared().path`. Falls back to
   * `useRouter().path` when omitted.
   */
  currentPath?: string
  className?: string
}

const PREV_LABEL: Record<Locale, string> = {
  en: 'Previous',
  cn: '上一页',
  'pt-BR': 'Anterior',
}

const NEXT_LABEL: Record<Locale, string> = {
  en: 'Next',
  cn: '下一页',
  'pt-BR': 'Próximo',
}

export default function Pager({ locale, currentPath, className }: PagerProps) {
  const router = useRouter()
  const path = currentPath ?? router.path
  const [, rest] = splitLocale(path)
  const { prev, next } = getPagerLinksCore(rest, locale, nav[locale])

  if (!prev && !next) return null

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'mt-12 grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-2',
        className,
      )}
    >
      {prev ? (
        <a
          href={prev.href}
          className="group flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground transition-colors hover:border-primary/50 hover:bg-accent/40"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            {PREV_LABEL[locale]}
          </span>
          <span className="font-medium transition-colors group-hover:text-primary">
            {prev.title}
          </span>
        </a>
      ) : (
        <span aria-hidden="true" />
      )}

      {next ? (
        <a
          href={next.href}
          className="group flex flex-col items-end gap-1 rounded-lg border border-border bg-card px-4 py-3 text-right text-card-foreground transition-colors hover:border-primary/50 hover:bg-accent/40 sm:col-start-2"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {NEXT_LABEL[locale]}
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </span>
          <span className="font-medium transition-colors group-hover:text-primary">
            {next.title}
          </span>
        </a>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  )
}
