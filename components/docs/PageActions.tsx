// PageActions — per-page utility row: a "Copy page" dropdown (Copy as Markdown
// / View as Markdown / Open in ChatGPT / Open in Claude) plus the MOBILE
// "On this page" collapsible (below xl, where the right-rail Toc is hidden).
//
// ISLAND: 'load'. Wired from the three pages/{en,cn,pt-BR}/docs/layout.island.tsx
// entries into DocsLayout's `pageActions` slot. Islands hydrate WITHOUT a
// Router/Shared context, so the path arrives via the `currentPath` prop.
//
// Markdown URL derivation (mirrors the <link rel="alternate" type="text/markdown">
// logic in middleware/01.head.ts): the rendered page's raw markdown is served at
//   en:     /<rest>.md            (en is served at the ROOT)
//   cn/pt:  /<locale>/<rest>.md
// where `rest` is splitLocale(currentPath)[1] and `locale` is the CONTENT locale
// — the en layout passes "en" even on cn/pt-BR fallback URLs (the rendered page
// IS the en markdown), so the URL always points at a file that exists.
//
// SSR: the trigger button + the mobile <details> render meaningful static HTML;
// the Radix Popover mounts client-side only (its useId() diverges between SSR
// and the island root — same pattern as ThemeToggle/LangSwitcher).
import * as React from 'react'
import {
  Bot,
  Check,
  ChevronDown,
  Copy,
  FileText,
  MessageSquare,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/nav/index.ts'
import { splitLocale } from '@/lib/docs/locale.ts'
import { getPageDataCore, tocHeadings } from '@/lib/docs/page-data.ts'
import pages from '@void/md/pages'
import { useRouter } from '@void/react'

export interface PageActionsProps {
  /**
   * CONTENT locale (the locale of the rendered markdown). The en layout passes
   * "en" even on cn/pt-BR fallback URLs; cn/pt-BR layouts pass their own.
   */
  locale: Locale
  /** ROUTE locale — drives the localized button/label text (chrome language). */
  routeLocale: Locale
  /**
   * Current ROUTE path, passed by the layout (resolved from `useShared().path`).
   * Falls back to `useRouter().path` when omitted (the SSR proxy default "/"
   * inside an island — the prop is the reliable source).
   */
  currentPath?: string
  /**
   * i18n-fallback flag (from middleware/02). Currently informational — the
   * content-locale prop already resolves the fallback to the en markdown — but
   * kept on the interface for parity with the other chrome islands.
   */
  fallback?: boolean
  className?: string
}

const COPY_PAGE: Record<Locale, string> = {
  en: 'Copy page',
  cn: '复制本页',
  'pt-BR': 'Copiar página',
}
const COPY_AS_MD: Record<Locale, string> = {
  en: 'Copy as Markdown',
  cn: '以 Markdown 复制',
  'pt-BR': 'Copiar como Markdown',
}
const COPIED: Record<Locale, string> = {
  en: 'Copied',
  cn: '已复制',
  'pt-BR': 'Copiado',
}
const VIEW_AS_MD: Record<Locale, string> = {
  en: 'View as Markdown',
  cn: '查看 Markdown',
  'pt-BR': 'Ver como Markdown',
}
const OPEN_CHATGPT: Record<Locale, string> = {
  en: 'Open in ChatGPT',
  cn: '在 ChatGPT 中打开',
  'pt-BR': 'Abrir no ChatGPT',
}
const OPEN_CLAUDE: Record<Locale, string> = {
  en: 'Open in Claude',
  cn: '在 Claude 中打开',
  'pt-BR': 'Abrir no Claude',
}
// Same strings as Toc's TOC_TITLE — the mobile collapsible is the below-xl
// stand-in for the right rail.
const ON_THIS_PAGE: Record<Locale, string> = {
  en: 'On This Page',
  cn: '本页目录',
  'pt-BR': 'Nesta página',
}

/** The AI-assistant prompt shared by the ChatGPT / Claude menu items. */
function aiPrompt(mdUrl: string): string {
  return encodeURIComponent(
    `Read https://napi.rs${mdUrl} and answer questions about it.`,
  )
}

export default function PageActions({
  locale,
  routeLocale,
  currentPath,
  className,
}: PageActionsProps) {
  const router = useRouter()
  const path = currentPath ?? router.path
  const [, rest] = splitLocale(path)

  // No markdown source (changelog islands, landing) → render nothing at all.
  const page = React.useMemo(
    () => (rest ? getPageDataCore(rest, locale, pages) : undefined),
    [rest, locale],
  )

  const [mounted, setMounted] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!page) return null

  const mdUrl = locale === 'en' ? `/${rest}.md` : `/${locale}/${rest}.md`
  const headings = tocHeadings(page.headings)

  const copyMarkdown = async () => {
    try {
      const res = await fetch(mdUrl)
      if (!res.ok) throw new Error(String(res.status))
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fetch/clipboard can fail (offline, permissions) — leave the menu open
      // and simply don't show the Copied state.
    }
  }

  const itemClass =
    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground'

  const trigger = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      // Match the search trigger's muted, input-like styling.
      className="text-muted-foreground h-9 gap-1.5 px-3 font-normal"
    >
      {copied ? (
        <Check className="size-4 text-green-600" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      {copied ? COPIED[routeLocale] : COPY_PAGE[routeLocale]}
      <ChevronDown className="size-3.5 opacity-60" aria-hidden="true" />
    </Button>
  )

  return (
    <div className={cn('flex flex-col items-end gap-2 text-sm', className)}>
      {/* Copy-page dropdown. Pre-mount: the plain trigger only (Radix useId
          SSR/island mismatch — see the header comment). */}
      {mounted ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1">
            <ul className="flex flex-col">
              <li>
                <button
                  type="button"
                  onClick={copyMarkdown}
                  className={itemClass}
                >
                  {copied ? (
                    <Check
                      className="size-4 text-green-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                  {copied ? COPIED[routeLocale] : COPY_AS_MD[routeLocale]}
                </button>
              </li>
              <li>
                <a
                  href={mdUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={itemClass}
                >
                  <FileText className="size-4" aria-hidden="true" />
                  {VIEW_AS_MD[routeLocale]}
                </a>
              </li>
              <li>
                <a
                  href={`https://chatgpt.com/?q=${aiPrompt(mdUrl)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={itemClass}
                >
                  <MessageSquare className="size-4" aria-hidden="true" />
                  {OPEN_CHATGPT[routeLocale]}
                </a>
              </li>
              <li>
                <a
                  href={`https://claude.ai/new?q=${aiPrompt(mdUrl)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={itemClass}
                >
                  <Bot className="size-4" aria-hidden="true" />
                  {OPEN_CLAUDE[routeLocale]}
                </a>
              </li>
            </ul>
          </PopoverContent>
        </Popover>
      ) : (
        trigger
      )}

      {/* Mobile "On this page" — the below-xl stand-in for the right-rail Toc
          (which is `hidden xl:block`). Pure <details>: toggles with no JS, so
          it works from the SSR HTML alone. Uses the CONTENT locale headings so
          cn/pt-BR fallback URLs list the rendered (en) page's headings. */}
      {headings.length > 0 ? (
        <details className="w-full rounded-lg border border-border px-4 py-2.5 xl:hidden">
          <summary className="cursor-pointer text-sm font-medium select-none">
            {ON_THIS_PAGE[routeLocale]}
          </summary>
          <ul className="mt-2 space-y-2 border-t border-border pt-2">
            {headings.map((h) => (
              <li key={h.slug}>
                <a
                  href={`#${h.slug}`}
                  className={cn(
                    'block text-muted-foreground transition-colors hover:text-foreground',
                    h.depth >= 4 ? 'pl-8' : h.depth === 3 ? 'pl-4' : 'pl-0',
                  )}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}
