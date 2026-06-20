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
import {
  getPageDataCore,
  tocHeadings,
  extractTocHeadings,
} from '@/lib/docs/page-data.ts'
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

  // Docs/blog headings come from the @void/md page (available at SSR). The
  // changelog pages are loader-driven islands with NO @void/md entry, so `page`
  // is undefined there and we fall back to scanning the rendered DOM after
  // mount (below). `page` being defined also gates the edit-on-GitHub link:
  // changelog has no markdown source, so a `pages/<locale>/<rest>.md` edit link
  // would 404.
  const page = React.useMemo(
    () => getPageDataCore(rest, locale, pages),
    [rest, locale],
  )
  const pageHeadings = React.useMemo(
    () => (page ? tocHeadings(page.headings) : []),
    [page],
  )

  // DOM-scanned headings for pages without an @void/md entry (changelog). The
  // server-rendered HTML carries markdown-it heading anchors (`<h2 id=…>`);
  // extractTocHeadings parses the same markup tested in node. Runs only after
  // mount (this is a 'visible' island), so SSR + first client render both show
  // nothing and there is no hydration mismatch — it populates post-hydration.
  const [domHeadings, setDomHeadings] = React.useState<
    ReadonlyArray<{ depth: number; slug: string; text: string }>
  >([])

  React.useEffect(() => {
    if (pageHeadings.length > 0) return // md page already provided headings
    const main = document.getElementById('main-content')
    if (!main) return
    setDomHeadings(tocHeadings(extractTocHeadings(main.innerHTML)))
  }, [pageHeadings, rest])

  const headings = pageHeadings.length > 0 ? pageHeadings : domHeadings

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
  // markdown lives at pages/<locale>/<leaf>.md. Only shown when the page HAS an
  // @void/md source: changelog (loader-driven island, no .md) would otherwise
  // get a link to a non-existent file.
  const editHref =
    page && rest ? `${EDIT_BASE}/pages/${locale}/${rest}.md` : null

  return (
    <nav
      aria-label="Table of contents"
      className={cn('sticky top-20 py-8 pr-4 text-sm', className)}
    >
      <p className="mb-3 font-medium text-foreground">{TOC_TITLE}</p>
      <ul className="space-y-2">
        {headings.map((h) => {
          const isActive = h.slug === activeSlug
          return (
            <li key={h.slug}>
              <a
                href={`#${h.slug}`}
                onClick={() => setActiveSlug(h.slug)}
                className={cn(
                  'block transition-colors',
                  // Indent by heading depth via padding only. Live napi.rs has
                  // NO left rail / accent bar on the TOC (the `ul` and links
                  // both report border-left:0): h2 flush, h3 +1rem, h4 +2rem
                  // (Nextra's `nx-pl-4` per nesting level).
                  h.depth >= 4 ? 'pl-8' : h.depth === 3 ? 'pl-4' : 'pl-0',
                  // Depth-based weight (not active-based): top-level h2 is
                  // semibold, nested headings are normal — matching Nextra.
                  h.depth === 2 && 'font-semibold',
                  // Active heading is the brand orange (var(--theme) ≈
                  // rgb(230,99,0)), matching napi.rs's nx-text-primary-600
                  // (rgb(230,92,0)). No extra weight, no accent bar.
                  isActive
                    ? 'text-[var(--theme)]'
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
