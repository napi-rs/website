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
import { Check, ChevronDown, Copy, FileText } from 'lucide-react'

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

// Brand marks for the "Open in …" menu items — lucide ships no brand icons
// (same rationale as the Navbar's inline GitHub/Discord marks).
//
// ChatGPT: the OpenAI knot, from Tabler Icons' `brand-openai`
// (https://tabler.io/icons — MIT license, © Paweł Kuna). STROKE style, so it
// sits naturally next to the lucide glyphs in this menu.
function ChatGptIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M11.217 19.384a3.501 3.501 0 0 0 6.783 -1.217v-5.167l-6 -3.35" />
      <path d="M5.214 15.014a3.501 3.501 0 0 0 4.446 5.266l4.34 -2.534v-6.946" />
      <path d="M6 7.63c-1.391 -.236 -2.787 .395 -3.534 1.689a3.474 3.474 0 0 0 1.271 4.745l4.263 2.514l6 -3.348" />
      <path d="M12.783 4.616a3.501 3.501 0 0 0 -6.783 1.217v5.067l6 3.45" />
      <path d="M18.786 8.986a3.501 3.501 0 0 0 -4.446 -5.266l-4.34 2.534v6.946" />
      <path d="M18 16.302c1.391 .236 2.787 -.395 3.534 -1.689a3.474 3.474 0 0 0 -1.271 -4.745l-4.308 -2.514l-5.955 3.42" />
    </svg>
  )
}

// Claude: the Anthropic starburst, from Simple Icons' `claude`
// (https://simpleicons.org — CC0). FILLED style (the mark is solid).
function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
    </svg>
  )
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
    <div
      className={cn('flex w-full flex-col items-end gap-2 text-sm', className)}
    >
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
                  <ChatGptIcon className="size-4" />
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
                  <ClaudeIcon className="size-4" />
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
