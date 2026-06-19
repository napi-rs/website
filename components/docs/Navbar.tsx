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
import { Github } from 'lucide-react'

import { useRouter } from '@void/react'
import { buttonVariants } from '@/components/ui/button'
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

const GITHUB_URL = 'https://github.com/napi-rs/napi-rs'
const DISCORD_URL = 'https://discord.gg/SpWzYHsKHs'

// Built once: per-locale set of leaves with an actual emitted @void/md page.
// Tab visibility + the tab's link target both key off REAL pages, never the nav
// existence sets (the nav lists blog/changelog leaves but no content exists yet,
// so those tabs stay hidden until their markdown lands).
const PAGE_EXISTENCE = buildPageExistenceSets(pages)

// lucide-react has no Discord glyph; inline the official mark (currentColor).
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
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

  return (
    // `justify-end` + the brand's `mr-auto` reproduce the live napi.rs (Nextra)
    // layout: brand hard-left, everything else (tabs · search · GitHub · Discord)
    // packed right. Theme + language toggles are NOT here — to match live they
    // live in the sidebar footer (docs) and the page footer (landing).
    <nav className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-end gap-3 px-4">
      {/* Brand (pushed hard-left) */}
      <a
        href={localizeHref('', locale)}
        className="mr-auto flex items-center"
        aria-label="NAPI-RS home"
      >
        <Logo />
      </a>

      {/* Primary tabs — right-aligned, just before search (live order) */}
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
        <Github className="size-4" />
      </a>

      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Discord"
        title="Discord"
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
      >
        <DiscordIcon className="size-4" />
      </a>
    </nav>
  )
}
