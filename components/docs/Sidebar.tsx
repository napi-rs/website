// Sidebar — collapsible, grouped section navigation for the docs shell.
//
// ─────────────────────────────────────────────────────────────────────────
// ISLAND MECHANISM (see contract.islandMechanism / DocsLayout header):
// This component is interactive (collapse state, mobile drawer, localStorage)
// so it MUST be hydrated. Per the verified island rule, the `with { island }`
// import lives in the per-locale entry files
//   pages/{en,cn,pt-BR}/docs/layout.island.tsx
// which import THIS component as `'../../../components/docs/Sidebar' with
// { island: 'load' }` and pass it into <DocsLayout sidebar={<Sidebar … />}>.
// Do NOT add an island import attribute here — it is a no-op in a shared
// component. Island components use plain <a> (no <Link>), which we do.
// ─────────────────────────────────────────────────────────────────────────
//
// Data: lib/nav `nav[locale].sidebar[tabKey]` — groups of leaves. The active
// tab is the first path segment AFTER the locale prefix (e.g. `/cn/docs/x` ->
// `docs`), defaulting to `docs`. The active leaf is highlighted by comparing
// the current ROUTE path against `localizeHref(leaf.path, locale)`.

import * as React from 'react'
import { ChevronRight, X } from 'lucide-react'
import { useRouter } from '@void/react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { nav, type Locale, type NavGroup } from '@/lib/nav/index.ts'
import { localizeHref, splitLocale } from '@/lib/docs/locale.ts'
import LangSwitcher from './LangSwitcher'
import ThemeToggle from './ThemeToggle'

const STORAGE_KEY = 'sidebar:open'

export interface SidebarProps {
  /** Active locale. The per-locale layout entry passes this literally. */
  locale: Locale
  /**
   * Current ROUTE path. Optional — defaults to `useRouter().path`. Accepting it
   * as a prop keeps the component testable and lets SSR pass a known value.
   */
  currentPath?: string
  /** Extra classes for the desktop <nav> container. */
  className?: string
}

/** Derive the active tab key from a ROUTE path (segment after the locale). */
function tabKeyFromPath(currentPath: string): string {
  const [, rest] = splitLocale(currentPath)
  const seg = rest.split('/')[0]
  return seg || 'docs'
}

/** Read the persisted per-group open map from localStorage (best-effort). */
function readStoredOpen(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** Stable key for a group's persisted open state, namespaced by locale+tab. */
function groupKey(locale: Locale, tabKey: string, group: string): string {
  return `${locale}:${tabKey}:${group}`
}

interface SidebarNavProps {
  groups: ReadonlyArray<NavGroup>
  locale: Locale
  tabKey: string
  currentPath: string
  /** Called when a leaf link is activated (used to close the mobile drawer). */
  onNavigate?: () => void
}

/** The shared group/leaf list — reused by both desktop and mobile drawer. */
function SidebarNav({
  groups,
  locale,
  tabKey,
  currentPath,
  onNavigate,
}: SidebarNavProps) {
  // Per-group open state. Default: all expanded. Persisted to localStorage.
  const [open, setOpen] = React.useState<Record<string, boolean>>({})

  // Hydrate persisted state after mount (avoids SSR/client mismatch: SSR and
  // first client render both treat every group as open).
  React.useEffect(() => {
    setOpen(readStoredOpen())
  }, [])

  const isOpen = React.useCallback(
    (group: string) => {
      const key = groupKey(locale, tabKey, group)
      // Undefined => default expanded.
      return open[key] !== false
    },
    [open, locale, tabKey],
  )

  const toggle = React.useCallback(
    (group: string) => {
      const key = groupKey(locale, tabKey, group)
      setOpen((prev) => {
        const next = { ...prev, [key]: prev[key] === false }
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {
          // ignore quota / privacy-mode errors
        }
        return next
      })
    },
    [locale, tabKey],
  )

  if (groups.length === 0) {
    return null
  }

  return (
    <nav aria-label="Docs navigation" className="flex flex-col gap-5">
      {groups.map((group) => {
        // A blank group title is the "flat group" marker (blog/changelog): the
        // leaves render directly with no collapsible header, matching live
        // napi.rs. Real docs groups always have a title and stay collapsible.
        const flat = group.title.trim() === ''
        const expanded = flat || isOpen(group.group)
        const panelId = `sidebar-group-${tabKey}-${group.group}`
        return (
          <div key={group.group} className="flex flex-col">
            {!flat && (
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(group.group)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5',
                  'text-xs font-semibold tracking-wide text-muted-foreground',
                  'transition-colors hover:text-sidebar-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                )}
              >
                <span className="truncate">{group.title}</span>
                <ChevronRight
                  aria-hidden="true"
                  className={cn(
                    'size-3.5 shrink-0 transition-transform duration-200',
                    expanded && 'rotate-90',
                  )}
                />
              </button>
            )}

            <ul
              id={panelId}
              hidden={!expanded}
              className={cn(
                'flex flex-col gap-0.5',
                // Flat groups have no header to indent under, so drop the
                // left rule + indent the grouped lists use.
                !flat && 'mt-1 border-l border-sidebar-border pl-2',
              )}
            >
              {group.items.map((item) => {
                const href = localizeHref(item.path, locale)
                const active = currentPath === href
                return (
                  <li key={item.path}>
                    <a
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      onClick={onNavigate}
                      className={cn(
                        'block rounded-md px-3 py-1.5 text-sm transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                        active
                          ? 'bg-[hsl(var(--theme-hsl)/0.1)] font-medium text-[var(--theme)]'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                      )}
                    >
                      {item.title}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

export default function Sidebar({
  locale,
  currentPath: currentPathProp,
  className,
}: SidebarProps) {
  const router = useRouter()
  const currentPath = currentPathProp ?? router.path

  const tabKey = tabKeyFromPath(currentPath)
  const groups = nav[locale]?.sidebar[tabKey] ?? []

  const [mobileOpen, setMobileOpen] = React.useState(false)
  const closeMobile = React.useCallback(() => setMobileOpen(false), [])

  // Close the mobile drawer on Escape; lock body scroll while it is open.
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

  const hasNav = groups.length > 0

  return (
    <>
      {/* Desktop sidebar. The DocsLayout aside is now always rendered (so the
          mobile drawer trigger below can show), so THIS desktop column hides
          itself below lg and shows as a flex column at lg+. Flex column:
          scrollable nav + a pinned footer holding the language + theme toggles
          (matching live napi.rs, which keeps them at the sidebar bottom on docs
          — they hydrate as children of this Sidebar island). */}
      <div
        className={cn(
          // Full viewport height (minus the 3.5rem navbar), NOT max-height: a
          // short nav (e.g. the blog with 3 links) would otherwise shrink this
          // flex column to its content and leave the footer floating mid-sidebar.
          // A fixed height lets the flex-1 nav expand and pin the footer to the
          // bottom, matching napi.rs's sticky-bottom locale/theme bar.
          'sticky top-14 hidden h-[calc(100vh-3.5rem)] flex-col lg:flex',
          'bg-sidebar text-sidebar-foreground',
          className,
        )}
      >
        <div className="thin-scrollbar flex-1 overflow-y-auto px-4 py-6">
          <SidebarNav
            groups={groups}
            locale={locale}
            tabKey={tabKey}
            currentPath={currentPath}
          />
        </div>
        <div className="flex items-center justify-between gap-1 border-t border-sidebar-border px-4 py-3">
          <LangSwitcher locale={locale} showLabel />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile: a floating trigger + off-canvas drawer. `lg:hidden` so it never
          competes with the desktop aside. Only mounted when there is nav. */}
      {hasNav && (
        <div className="lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-haspopup="dialog"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="fixed bottom-4 left-4 z-30 shadow-md"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
            Menu
          </Button>

          {mobileOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Docs navigation"
              className="fixed inset-0 z-50"
            >
              {/* Backdrop */}
              <div
                onClick={closeMobile}
                className="absolute inset-0 bg-black/50"
                aria-hidden="true"
              />
              {/* Drawer panel */}
              <div
                className={cn(
                  'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col',
                  'bg-sidebar text-sidebar-foreground shadow-xl',
                  'border-r border-sidebar-border',
                )}
              >
                <div className="flex items-center justify-end border-b border-sidebar-border px-3 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Close navigation"
                    onClick={closeMobile}
                  >
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                </div>
                <div className="thin-scrollbar flex-1 overflow-y-auto px-4 py-4">
                  <SidebarNav
                    groups={groups}
                    locale={locale}
                    tabKey={tabKey}
                    currentPath={currentPath}
                    onNavigate={closeMobile}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
