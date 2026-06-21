// Navbar — the shared top bar (docs + landing). THIS is an island entry (it is
// imported with `{ island: 'load' }` from each layout/landing entry); its child
// SearchDialog hydrates within it.
//
// Layout (matches live napi.rs / Nextra):
//   [ Logo ] ......................... [ tab tab tab ] [ Search ] [ GitHub ] [ Discord ]
//
// Theme + language toggles are deliberately NOT in the navbar — live keeps them
// in the sidebar footer (docs) and the page footer (landing), so we do too.
//
// Tabs come from nav[locale].tabs (which carry NO href). A section has no index
// page, so each tab links to the FIRST REACHABLE leaf of its section
// (firstSectionLeafHref) — and a tab is only rendered when its section actually
// has a reachable page (blog/changelog have no migrated content yet → hidden).
// The active tab is the one whose key matches the first path segment after the
// locale (the "section"). We read the live route from useRouter().path so the
// highlight follows client-side navigation.
//
// Island rules: navigate with plain <a> (no <Link>); the GitHub/Discord links
// are external <a target="_blank">.
import * as React from 'react'
import { createPortal } from 'react-dom'
import { Menu, X } from 'lucide-react'
import { useRouter } from '@void/react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { nav, type Locale } from '@/lib/nav/index.ts'
import { localizeHref, splitLocale } from '@/lib/docs/locale.ts'
import {
  buildPageExistenceSets,
  firstSectionLeafHref,
} from '@/lib/docs/page-data.ts'
import pages from '@void/md/pages'

import Logo from './Logo'
import SearchDialog from './SearchDialog'
import LangSwitcher from './LangSwitcher'
import ThemeToggle from './ThemeToggle'
import { SidebarNav } from './Sidebar'

const GITHUB_URL = 'https://github.com/napi-rs/napi-rs'
const DISCORD_URL = 'https://discord.gg/SpWzYHsKHs'

// Built once: per-locale set of leaves with an actual emitted @void/md page.
// Tab visibility + the tab's link target both key off REAL pages, never the nav
// existence sets (the nav lists blog/changelog leaves but no content exists yet,
// so those tabs stay hidden until their markdown lands).
const PAGE_EXISTENCE = buildPageExistenceSets(pages)

// Brand marks — FILLED (fill:currentColor), matching the live napi.rs / Nextra
// navbar exactly. lucide-react's `Github` is a STROKE/outline glyph that renders
// as a thin hollow octocat (and lucide has no Discord mark at all), so we inline
// the two filled marks verbatim from the live site. The viewBox values
// (`3 3 18 18` for GitHub, `0 5 30.67 23.25` for Discord) and path data are the
// Nextra icon set's, so the rendered shapes are byte-for-byte the live ones.
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      viewBox="3 3 18 18"
      fill="currentColor"
      className={className}
    >
      <path d="M12 3C7.0275 3 3 7.12937 3 12.2276C3 16.3109 5.57625 19.7597 9.15374 20.9824C9.60374 21.0631 9.77249 20.7863 9.77249 20.5441C9.77249 20.3249 9.76125 19.5982 9.76125 18.8254C7.5 19.2522 6.915 18.2602 6.735 17.7412C6.63375 17.4759 6.19499 16.6569 5.8125 16.4378C5.4975 16.2647 5.0475 15.838 5.80124 15.8264C6.51 15.8149 7.01625 16.4954 7.18499 16.7723C7.99499 18.1679 9.28875 17.7758 9.80625 17.5335C9.885 16.9337 10.1212 16.53 10.38 16.2993C8.3775 16.0687 6.285 15.2728 6.285 11.7432C6.285 10.7397 6.63375 9.9092 7.20749 9.26326C7.1175 9.03257 6.8025 8.08674 7.2975 6.81794C7.2975 6.81794 8.05125 6.57571 9.77249 7.76377C10.4925 7.55615 11.2575 7.45234 12.0225 7.45234C12.7875 7.45234 13.5525 7.55615 14.2725 7.76377C15.9937 6.56418 16.7475 6.81794 16.7475 6.81794C17.2424 8.08674 16.9275 9.03257 16.8375 9.26326C17.4113 9.9092 17.76 10.7281 17.76 11.7432C17.76 15.2843 15.6563 16.0687 13.6537 16.2993C13.98 16.5877 14.2613 17.1414 14.2613 18.0065C14.2613 19.2407 14.25 20.2326 14.25 20.5441C14.25 20.7863 14.4188 21.0746 14.8688 20.9824C16.6554 20.364 18.2079 19.1866 19.3078 17.6162C20.4077 16.0457 20.9995 14.1611 21 12.2276C21 7.12937 16.9725 3 12 3Z" />
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      viewBox="0 5 30.67 23.25"
      fill="currentColor"
      className={className}
    >
      <path d="M26.0015 6.9529C24.0021 6.03845 21.8787 5.37198 19.6623 5C19.3833 5.48048 19.0733 6.13144 18.8563 6.64292C16.4989 6.30193 14.1585 6.30193 11.8336 6.64292C11.6166 6.13144 11.2911 5.48048 11.0276 5C8.79575 5.37198 6.67235 6.03845 4.6869 6.9529C0.672601 12.8736 -0.41235 18.6548 0.130124 24.3585C2.79599 26.2959 5.36889 27.4739 7.89682 28.2489C8.51679 27.4119 9.07477 26.5129 9.55525 25.5675C8.64079 25.2265 7.77283 24.808 6.93587 24.312C7.15286 24.1571 7.36986 23.9866 7.57135 23.8161C12.6241 26.1255 18.0969 26.1255 23.0876 23.8161C23.3046 23.9866 23.5061 24.1571 23.7231 24.312C22.8861 24.808 22.0182 25.2265 21.1037 25.5675C21.5842 26.5129 22.1422 27.4119 22.7621 28.2489C25.2885 27.4739 27.8769 26.2959 30.5288 24.3585C31.1952 17.7559 29.4733 12.0212 26.0015 6.9529ZM10.2527 20.8402C8.73376 20.8402 7.49382 19.4608 7.49382 17.7714C7.49382 16.082 8.70276 14.7025 10.2527 14.7025C11.7871 14.7025 13.0425 16.082 13.0115 17.7714C13.0115 19.4608 11.7871 20.8402 10.2527 20.8402ZM20.4373 20.8402C18.9183 20.8402 17.6768 19.4608 17.6768 17.7714C17.6768 16.082 18.8873 14.7025 20.4373 14.7025C21.9717 14.7025 23.2271 16.082 23.1961 17.7714C23.1961 19.4608 21.9872 20.8402 20.4373 20.8402Z" />
    </svg>
  )
}

export interface NavbarProps {
  /** Active locale (the per-locale layout.island passes its own literal). */
  locale: Locale
  /**
   * Current ROUTE path, passed by the layout (resolved from `useShared().path`).
   * Islands hydrate WITHOUT a RouterContext, so `useRouter().path` is the SSR
   * proxy default `"/"` both on the server and after hydration — the path must
   * arrive as a serializable prop for the active-tab highlight to be correct.
   * Falls back to `useRouter().path` when omitted.
   */
  currentPath?: string
}

export default function Navbar({ locale, currentPath }: NavbarProps) {
  const router = useRouter()
  const path = currentPath ?? router?.path ?? ''
  const [, rest] = splitLocale(path)
  const activeSection = rest.split('/')[0] // '' | 'docs' | 'blog' | 'changelog'

  const localeNav = nav[locale]
  // Only render tabs whose section currently has ≥1 reachable page, and point
  // each tab at the first such leaf (sections have no index page → /docs 404s).
  const tabs = (localeNav?.tabs ?? [])
    .map((tab) => ({
      tab,
      href: localeNav
        ? firstSectionLeafHref(tab.key, locale, localeNav, PAGE_EXISTENCE)
        : null,
    }))
    .filter(
      (t): t is { tab: (typeof t)['tab']; href: string } => t.href !== null,
    )

  // Sidebar groups for the active section — used ONLY by the mobile drawer (the
  // desktop sidebar is its own island). Empty on the landing root (no section),
  // which is correct: the landing drawer then shows just tabs + locale/theme.
  const sidebarGroups = activeSection
    ? (localeNav?.sidebar[activeSection] ?? [])
    : []

  // Mobile drawer state. Below lg the navbar's tabs + the desktop sidebar are
  // both hidden, so this hamburger-triggered full-screen drawer is the SOLE
  // mobile nav — folding tabs + section nav + locale/theme into one menu, the
  // way live napi.rs (Nextra) does.
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const closeMobile = React.useCallback(() => setMobileOpen(false), [])

  // While the drawer is open: close on Escape and lock body scroll.
  React.useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [mobileOpen])

  return (
    // `justify-end` + the brand's `mr-auto` reproduce the live napi.rs (Nextra)
    // layout: brand hard-left, everything else (tabs · search · GitHub · Discord
    // · mobile hamburger) packed right. Theme + language toggles are NOT here —
    // to match live they live in the sidebar footer (docs), the page footer
    // (landing), and the mobile drawer footer (below).
    <nav className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-end gap-3 px-4">
      {/* Brand (pushed hard-left) */}
      <a
        href={localizeHref('', locale)}
        className="mr-auto flex items-center"
        aria-label="NAPI-RS home"
      >
        <Logo />
      </a>

      {/* Primary tabs — right-aligned, just before search (live order). Hidden
          below md: on mobile they fold into the hamburger drawer. */}
      <ul className="hidden items-center gap-1 md:flex">
        {tabs.map(({ tab, href }) => {
          const isActive = tab.key === activeSection
          return (
            <li key={tab.key}>
              <a
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.title}
              </a>
            </li>
          )
        })}
      </ul>

      <SearchDialog locale={locale} />

      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="GitHub"
        title="GitHub"
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
      >
        <GithubIcon className="size-6" />
      </a>

      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Discord"
        title="Discord"
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
      >
        <DiscordIcon className="size-6" />
      </a>

      {/* Mobile hamburger — toggles the full-screen drawer. Hidden at lg+, where
          the desktop tabs + sidebar take over. */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        aria-haspopup="dialog"
        onClick={() => setMobileOpen((v) => !v)}
        className="lg:hidden"
      >
        {mobileOpen ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Menu aria-hidden="true" className="size-5" />
        )}
      </Button>

      {/* The drawer is portaled to <body>: the sticky header carries
          `backdrop-blur` (backdrop-filter), which makes it a containing block
          for fixed descendants — a `fixed` drawer rendered inside would be
          clipped to the 3.5rem header box. Portaling escapes that. It renders
          only while open, which is a client-only state, so `document` is always
          defined when this runs. Sits below the navbar (top-14) so the bar —
          and the hamburger that closes it — stay visible, matching napi.rs. */}
      {mobileOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="fixed inset-x-0 top-14 bottom-0 z-40 flex flex-col bg-background lg:hidden"
            >
              <div className="flex-1 overflow-y-auto px-4 py-5">
                {/* Section tabs (Docs · Blog · Changelog) as pills. */}
                {tabs.length > 0 && (
                  <ul className="mb-5 flex flex-wrap gap-2">
                    {tabs.map(({ tab, href }) => {
                      const isActive = tab.key === activeSection
                      return (
                        <li key={tab.key}>
                          <a
                            href={href}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                              'block rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-[hsl(var(--theme-hsl)/0.1)] text-[var(--theme)]'
                                : 'bg-muted text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {tab.title}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Active-section nav — the same tree the desktop sidebar uses. */}
                {sidebarGroups.length > 0 && (
                  <SidebarNav
                    groups={sidebarGroups}
                    locale={locale}
                    tabKey={activeSection}
                    currentPath={path}
                    onNavigate={closeMobile}
                  />
                )}
              </div>

              {/* Footer — locale + theme, matching live napi.rs's drawer bottom. */}
              <div className="flex items-center justify-between gap-1 border-t border-border px-4 py-3">
                <LangSwitcher locale={locale} showLabel />
                <ThemeToggle />
              </div>
            </div>,
            document.body,
          )
        : null}
    </nav>
  )
}
