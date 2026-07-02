// SearchDialog — Cmd-K / Ctrl-K documentation search.
//
// Island note: lives inside the Navbar island. Renders a ghost "Search" trigger
// button (with the platform-appropriate ⌘K / Ctrl K hint) plus a cmdk
// CommandDialog. A global keydown listener opens it on ⌘K (mac) / Ctrl+K
// (others) and "/". Selecting a result navigates with window.location (island
// mode = plain navigation, no <Link>).
//
// Data: buildSearchIndexCore(@void/md/pages) yields per-locale entries
// { path (locale-prefixed route), title, headings[], description? }. We use the
// entries for the ACTIVE locale only and let cmdk do the fuzzy filtering across
// title + heading text + description.
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
import type { Locale } from '@/lib/nav/index.ts'
import {
  buildSearchIndexCore,
  type SearchEntry,
} from '@/lib/docs/search-index.ts'
import pages from '@void/md/pages'

// Per-locale index, built once from the live md-pages metadata.
const INDEX = buildSearchIndexCore(pages)

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
  const [mac, setMac] = React.useState(false)
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

  const entries: SearchEntry[] = INDEX[locale] ?? []

  const go = (path: string) => {
    setOpen(false)
    if (typeof window !== 'undefined') window.location.assign(path)
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
        >
          <CommandInput placeholder={PLACEHOLDER[locale]} />
          {/*
          cmdk filters each CommandItem by its `value` — we pack title +
          description + heading text into the value so a query matches any of
          them, not just the visible title. If the index is somehow empty we
          fall through to a localized loading hint instead of "no results".
        */}
          <CommandList>
            {/*
            CommandEmpty renders only when cmdk finds zero MATCHING items. When
            the locale index itself is empty (no pages yet) we show the
            localized loading hint instead, so the dialog is never silent.
          */}
            <CommandEmpty>
              {entries.length === 0 ? LOADING[locale] : EMPTY[locale]}
            </CommandEmpty>
            <CommandGroup>
              {entries.map((entry) => {
                const value = [
                  entry.title,
                  entry.description ?? '',
                  entry.headings.join(' '),
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <CommandItem
                    key={entry.path}
                    value={value}
                    onSelect={() => go(entry.href)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="text-sm font-medium">{entry.title}</span>
                    {entry.description ? (
                      <span className="text-muted-foreground line-clamp-1 text-xs">
                        {entry.description}
                      </span>
                    ) : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      ) : null}
    </>
  )
}
