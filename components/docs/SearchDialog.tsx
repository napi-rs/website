// SearchDialog — Cmd-K / Ctrl-K documentation search.
//
// Island note: lives inside the Navbar island. Renders a ghost "Search" trigger
// button (with the platform-appropriate ⌘K / Ctrl K hint) plus a cmdk
// CommandDialog. A global keydown listener opens it on ⌘K (mac) / Ctrl+K
// (others) and "/". Selecting a result navigates with window.location (island
// mode = plain navigation, no <Link>).
//
// Data: the FULL per-locale index at `/search-index.<locale>.json` (title +
// headings-with-slugs + description + plain-text body + sidebar group/section)
// is fetched LAZILY on first dialog open and cached per locale in a module map
// — the dialog never blocks the initial page load on the ~100KB JSON. While it
// loads we show a localized loading row; on fetch failure we fall back to the
// in-module metadata index (buildSearchIndexCore over @void/md/pages: title +
// heading texts + description only) so search keeps working, just without body
// matches/snippets.
//
// Ranking is OURS, not cmdk's: `shouldFilter={false}` disables cmdk's fuzzy
// filter and lib/docs/search-index.ts's rankSearchEntries orders results
// (title-prefix > title-includes > heading > description/body, capped at ~30),
// carrying the matched heading / body snippet for the result sub-row.
import * as React from 'react'
import { SearchIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { nav, type Locale } from '@/lib/nav/index.ts'
import {
  buildSearchIndexCore,
  groupSearchResults,
  pageLeaf,
  rankSearchEntries,
  type FullSearchEntry,
  type SearchEntry,
  type SearchResult,
} from '@/lib/docs/search-index.ts'
import pages from '@void/md/pages'

// FALLBACK per-locale metadata index, built once from the live md-pages
// metadata. Used only when the /search-index.<locale>.json fetch fails.
const FALLBACK_INDEX = buildSearchIndexCore(pages)

// Adapt a fallback metadata entry to the full-entry shape so the dialog has ONE
// rendering path. Headings lose their slug (the metadata index carries texts
// only), so fallback heading matches navigate to the page, not the anchor.
function toFullEntry(entry: SearchEntry): FullSearchEntry {
  return {
    path: entry.path,
    href: entry.href,
    title: entry.title,
    description: entry.description,
    // Derive the section from the LOCALE-STRIPPED leaf, not the href: a cn
    // fallback entry's href is `/cn/docs/…`, and `cn` matches no tab key —
    // every result would collapse under a literal locale-code group.
    section: pageLeaf(entry.path).split('/')[0] || 'docs',
    group: '',
    headings: entry.headings.map((text) => ({ depth: 2, slug: '', text })),
    body: '',
  }
}

// Per-locale promise cache for the lazy full-index fetch: one request per
// locale per page load, shared by every open of the dialog. `null` = failed
// (the caller then falls back to FALLBACK_INDEX).
const FULL_INDEX_CACHE = new Map<Locale, Promise<FullSearchEntry[] | null>>()
function fetchFullIndex(locale: Locale): Promise<FullSearchEntry[] | null> {
  let cached = FULL_INDEX_CACHE.get(locale)
  if (!cached) {
    cached = fetch(`/search-index.${locale}.json`)
      .then((res) =>
        res.ok ? (res.json() as Promise<FullSearchEntry[]>) : null,
      )
      .catch(() => null)
    FULL_INDEX_CACHE.set(locale, cached)
  }
  return cached
}

const PLACEHOLDER: Record<Locale, string> = {
  en: 'Search documentation…',
  cn: '搜索文档…',
  'pt-BR': 'Buscar documentação…',
}

const LOADING: Record<Locale, string> = {
  en: 'Loading',
  cn: '正在加载',
  'pt-BR': 'Carregando',
}

const EMPTY: Record<Locale, string> = {
  en: 'No results found.',
  cn: '未找到结果。',
  'pt-BR': 'Nenhum resultado encontrado.',
}

const TRIGGER_LABEL: Record<Locale, string> = {
  en: 'Search',
  cn: '搜索',
  'pt-BR': 'Buscar',
}

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
}

export interface SearchDialogProps {
  /** Active locale (the per-locale layout.island passes its own literal). */
  locale: Locale
  className?: string
}

export default function SearchDialog({ locale, className }: SearchDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [mac, setMac] = React.useState(false)
  // undefined = not attempted yet, null = fetch failed (fallback), array = ready.
  const [fullIndex, setFullIndex] = React.useState<
    FullSearchEntry[] | null | undefined
  >(undefined)
  // Defer the Radix-backed CommandDialog until after mount: islands hydrate as
  // isolated roots, so Radix's useId() (in DialogTitle/Description) diverges
  // between SSR and the island root, producing a benign hydration mismatch. The
  // trigger button is plain (non-Radix) so it can SSR; the dialog mounts client
  // side only.
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMac(isMac())
    setMounted(true)
  }, [])

  // Lazy-load the full index on FIRST open (per-locale module cache dedupes
  // later opens and any concurrent trigger).
  React.useEffect(() => {
    if (!open || fullIndex !== undefined) return
    let cancelled = false
    void fetchFullIndex(locale).then((index) => {
      if (!cancelled) setFullIndex(index)
    })
    return () => {
      cancelled = true
    }
  }, [open, fullIndex, locale])

  // Global hotkey: ⌘K (mac) / Ctrl+K (others), plus "/".
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }
      // "/" opens search unless the user is typing in a field.
      if (e.key === '/' && !open) {
        const t = e.target as HTMLElement | null
        const tag = t?.tagName
        const typing =
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          t?.getAttribute('role') === 'textbox' ||
          (t?.isContentEditable ?? false)
        if (!typing) {
          e.preventDefault()
          setOpen(true)
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // The ranked result set: our own scoring (see the header comment). Falls back
  // to the metadata index (mapped to the full shape) when the fetch failed.
  const entries = React.useMemo<FullSearchEntry[]>(() => {
    if (fullIndex) return fullIndex
    if (fullIndex === null)
      return (FALLBACK_INDEX[locale] ?? []).map(toFullEntry)
    return []
  }, [fullIndex, locale])

  const results = React.useMemo<SearchResult[]>(
    () => rankSearchEntries(entries, query),
    [entries, query],
  )

  // Group the ranked results by sidebar group (falling back to the localized
  // section/tab label). groupSearchResults CONSOLIDATES by label, so a query
  // whose ranking interleaves groups still emits one CommandGroup per label —
  // adjacency-only grouping would produce duplicate React keys.
  const groups = React.useMemo(() => {
    const sectionLabel = (section: string) =>
      nav[locale]?.tabs.find((t) => t.key === section)?.title ?? section
    return groupSearchResults(
      results,
      (entry) => entry.group.trim() || sectionLabel(entry.section),
    )
  }, [results, locale])

  const go = (r: SearchResult) => {
    setOpen(false)
    if (typeof window === 'undefined') return
    const hash = r.heading?.slug ? `#${r.heading.slug}` : ''
    window.location.assign(r.entry.href + hash)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={TRIGGER_LABEL[locale]}
        className={cn(
          // Mirror live napi.rs: a wide (~w-64) input-like box showing the full
          // localized placeholder, with the ⌘K hint pinned to the right edge.
          'text-muted-foreground h-9 justify-start gap-2 px-3 font-normal sm:w-56 md:w-64',
          className,
        )}
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="hidden truncate sm:inline">{PLACEHOLDER[locale]}</span>
        <kbd className="bg-muted text-muted-foreground pointer-events-none ml-auto hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium select-none sm:inline-flex">
          {mac ? '⌘' : 'Ctrl'} K
        </kbd>
      </Button>

      {mounted ? (
        <CommandDialog
          open={open}
          onOpenChange={setOpen}
          title={TRIGGER_LABEL[locale]}
          description={PLACEHOLDER[locale]}
          // We rank results ourselves (rankSearchEntries) — disable cmdk's
          // built-in fuzzy filter so it neither re-orders nor hides them.
          commandProps={{ shouldFilter: false }}
        >
          <CommandInput
            placeholder={PLACEHOLDER[locale]}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {/* Localized loading row while the first lazy fetch is in flight.
                On fetch failure the fallback index is used instead, so this
                never strands the user. */}
            {fullIndex === undefined ? (
              <div className="text-muted-foreground py-6 text-center text-sm">
                {LOADING[locale]}…
              </div>
            ) : null}
            <CommandEmpty>{EMPTY[locale]}</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup heading={group.label} key={group.label}>
                {group.items.map((r) => {
                  const sub = r.heading
                    ? `# ${r.heading.text}`
                    : (r.snippet ?? r.entry.description)
                  return (
                    <CommandItem
                      key={r.entry.path + (r.heading?.slug ?? '')}
                      value={r.entry.path + (r.heading?.slug ?? '')}
                      onSelect={() => go(r)}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <span className="text-sm font-medium">
                        {r.entry.title}
                      </span>
                      {sub ? (
                        <span className="text-muted-foreground line-clamp-1 text-xs">
                          {sub}
                        </span>
                      ) : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </CommandDialog>
      ) : null}
    </>
  )
}
