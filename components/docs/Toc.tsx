// Toc — right-rail table of contents with scroll-spy.
//
// ISLAND: 'visible'. The layout.island.tsx entry imports it
// `with { island: 'visible' }`. The component owns NO island imports itself
// (per the verified island rule) and uses plain <a href="#slug"> anchors.
//
// Headings source (runtime join): @void/md/pages is the virtual module of all
// markdown pages, keyed by LOCALE-PREFIXED path. We resolve the current page via
//   getPageDataCore(rest, locale, pages)   // rest from splitLocale(router.path)
// then filter to h2–h4 with tocHeadings(). This mirrors the contract's
// `useCurrentPageHeadings()` (which is a thin wrapper over exactly this join).
//
// Scroll-spy: an IntersectionObserver watches every heading anchor (the
// markdown renderer emits `id="slug"` on headings); the entry nearest the top of
// the viewport becomes the active item. Falls back to the first heading.
import * as React from 'react'

import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/nav/index.ts'
import { getLocale, splitLocale } from '@/lib/docs/locale.ts'
import { getPageDataCore, tocHeadings } from '@/lib/docs/page-data.ts'
import pages from '@void/md/pages'
import { useRouter } from '@void/react'

export interface TocProps {
  /**
   * Active locale. Optional — defaults to deriving it from the current path so
   * the single (locale-agnostic) island works for all three locales.
   */
  locale?: Locale
  /**
   * Current ROUTE path, passed by the layout (resolved from `useShared().path`).
   * Islands hydrate WITHOUT a RouterContext, so `useRouter().path` is the SSR
   * proxy default `"/"` after hydration — the path must arrive as a prop for the
   * heading lookup to resolve. Falls back to `useRouter().path` when omitted.
   */
  currentPath?: string
  className?: string
}

// Live napi.rs (Nextra) does NOT localize the TOC title or the feedback label —
// both render in English on every locale (verified against napi.rs/{cn,pt-BR}).
// Only the edit-on-GitHub label is localized. We match that exactly.
const TOC_TITLE = 'On This Page'
const FEEDBACK_LABEL = 'Question? Give us feedback →'

// TOC footer links (match live napi.rs / Nextra): a feedback link to the docs
// repo issues + an "edit this page on GitHub" link to the markdown source.
const EDIT_BASE = 'https://github.com/napi-rs/website/blob/main'
const FEEDBACK_URL =
  'https://github.com/napi-rs/website/issues/new?labels=feedback&title=Feedback'

const EDIT_LABEL: Record<Locale, string> = {
  en: 'Edit this page on GitHub →',
  cn: '在 GitHub 上编辑本页 →',
  'pt-BR': 'Editar essa página no Github →',
}

export default function Toc({
  locale: localeProp,
  currentPath,
  className,
}: TocProps) {
  const router = useRouter()
  const path = currentPath ?? router.path
  const locale = localeProp ?? getLocale(path)
  const [, rest] = splitLocale(path)

  const headings = React.useMemo(() => {
    const page = getPageDataCore(rest, locale, pages)
    return page ? tocHeadings(page.headings) : []
  }, [rest, locale])

  const [activeSlug, setActiveSlug] = React.useState<string | null>(
    headings[0]?.slug ?? null,
  )

  React.useEffect(() => {
    if (headings.length === 0) return

    const elements = headings
      .map((h) => document.getElementById(h.slug))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    // Track which headings are currently intersecting; the topmost wins.
    const visible = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }

        // Pick the first heading (in document order) that is currently visible.
        const firstVisible = headings.find((h) => visible.has(h.slug))
        if (firstVisible) {
          setActiveSlug(firstVisible.slug)
        }
      },
      {
        // Bias the active region toward the top of the viewport so the heading
        // a reader is actually looking at is highlighted.
        rootMargin: '0px 0px -70% 0px',
        threshold: [0, 1],
      },
    )

    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  // Edit-on-GitHub source path: same derivation as <EditOnGithub> — the new
  // markdown lives at pages/<locale>/<leaf>.md.
  const editHref = rest ? `${EDIT_BASE}/pages/${locale}/${rest}.md` : null

  return (
    <nav
      aria-label="Table of contents"
      className={cn('sticky top-20 py-8 pr-4 text-sm', className)}
    >
      <p className="mb-3 font-medium text-foreground">{TOC_TITLE}</p>
      <ul className="space-y-2 border-l border-border">
        {headings.map((h) => {
          const isActive = h.slug === activeSlug
          return (
            <li key={h.slug}>
              <a
                href={`#${h.slug}`}
                onClick={() => setActiveSlug(h.slug)}
                className={cn(
                  '-ml-px block border-l border-transparent transition-colors',
                  // Indent one level deeper per heading depth (h2 → h3 → h4),
                  // matching the live napi.rs right-rail nesting.
                  h.depth >= 4 ? 'pl-9' : h.depth === 3 ? 'pl-6' : 'pl-3',
                  isActive
                    ? 'border-primary font-medium text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={isActive ? 'location' : undefined}
              >
                {h.text}
              </a>
            </li>
          )
        })}
      </ul>

      {/* Footer links — feedback + edit-on-GitHub, matching live napi.rs. */}
      <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4 text-muted-foreground">
        <a
          href={FEEDBACK_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="transition-colors hover:text-foreground"
        >
          {FEEDBACK_LABEL}
        </a>
        {editHref ? (
          <a
            href={editHref}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-foreground"
          >
            {EDIT_LABEL[locale]}
          </a>
        ) : null}
      </div>
    </nav>
  )
}
