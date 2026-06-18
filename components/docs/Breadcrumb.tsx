// Breadcrumb — STATIC docs breadcrumb trail: Home > tab > group > leaf.
//
// Rendered as a slot prop of DocsLayout; NOT an island (zero JS). It may read
// `useRouter().path` at SSR to derive the current leaf, but it uses plain <a>
// anchors (no <Link>) so it works without hydration.
//
// Data comes from getBreadcrumbCore(leaf, locale, nav[locale], PAGE_EXISTENCE);
// the group entry has an empty href and is rendered as plain (non-link) text per
// the helper's contract, and the tab crumb links to the first reachable leaf of
// its section (the bare `/docs` index 404s).
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { nav } from '@/lib/nav/index.ts'
import type { Locale } from '@/lib/nav/index.ts'
import { splitLocale } from '@/lib/docs/locale.ts'
import {
  getBreadcrumbCore,
  buildPageExistenceSets,
} from '@/lib/docs/page-data.ts'
import pages from '@void/md/pages'
import { useRouter } from '@void/react'

// Per-locale set of leaves with a real emitted @void/md page. The tab crumb
// links to the first reachable leaf of its section, so it must key off the same
// real-page existence the navbar tab uses (never the nav existence sets, which
// list blog/changelog leaves that have no content yet).
const PAGE_EXISTENCE = buildPageExistenceSets(pages)

export interface BreadcrumbProps {
  /** Active locale. The per-locale layout knows this literally. */
  locale: Locale
  /**
   * Current ROUTE path. Static components are SSR-only (no client router), so
   * the layout passes the path resolved from `useShared().path`. Falls back to
   * `useRouter().path` when omitted (e.g. if ever rendered inside an island).
   */
  currentPath?: string
  className?: string
}

export default function Breadcrumb({
  locale,
  currentPath,
  className,
}: BreadcrumbProps) {
  const router = useRouter()
  const path = currentPath ?? router.path
  const [, rest] = splitLocale(path)
  const items = getBreadcrumbCore(rest, locale, nav[locale], PAGE_EXISTENCE)

  if (items.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('mb-4 text-sm text-muted-foreground', className)}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li
              key={`${item.label}-${i}`}
              className="flex items-center gap-1.5"
            >
              {i > 0 ? (
                <ChevronRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground/60"
                />
              ) : null}
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={cn(isLast && 'font-medium text-foreground')}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
