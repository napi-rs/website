// LangSwitcher — locale picker rendered as a Popover of <a> links.
//
// Island note: lives inside the Navbar island. Island components navigate with
// plain <a> (no <Link>) — full document navigation, which is correct for a
// locale switch (the server re-derives locale + i18n fallback from the URL).
//
// Target URL is computed per the en-at-root vs cn/pt-BR-prefixed asymmetry, with
// graceful fallback when the destination locale lacks the current page:
//   computeLangSwitchUrl(currentPath, targetLocale, existence, splitLocale)
// `existence` is built ONCE from the generated nav at module scope.
import * as React from 'react'
import { Check, Globe } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { locales, nav, type Locale } from '@/lib/nav/index.ts'
import { splitLocale } from '@/lib/docs/locale.ts'
import {
  buildExistenceSets,
  computeLangSwitchUrl,
} from '@/lib/docs/page-data.ts'

// Built once: per-locale set of leaf paths that exist in that locale.
const EXISTENCE = buildExistenceSets(nav)

export interface LangSwitcherProps {
  /** Active locale (the per-locale layout.island passes its own literal). */
  locale: Locale
  className?: string
}

export default function LangSwitcher({ locale, className }: LangSwitcherProps) {
  const [open, setOpen] = React.useState(false)
  // Live route pathname. Empty on SSR (server has no window); resolved after
  // mount and refreshed whenever the popover opens so links stay correct across
  // client-side navigations.
  const [path, setPath] = React.useState('')
  // Defer the Radix Popover until after mount. Islands hydrate as isolated React
  // roots, so Radix's useId() yields different ids on the server vs the island
  // root → a (benign but noisy) hydration mismatch on the trigger's
  // aria-controls. Rendering a plain trigger at SSR (and only mounting the
  // Popover client-side) sidesteps the SSR useId entirely.
  const [mounted, setMounted] = React.useState(false)

  const syncPath = React.useCallback(() => {
    if (typeof window !== 'undefined') setPath(window.location.pathname)
  }, [])

  React.useEffect(() => {
    setMounted(true)
    syncPath()
  }, [syncPath])

  const active = locales.find((l) => l.locale === locale)

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Switch language"
        title={active?.text ?? 'Switch language'}
        className={className}
      >
        <Globe className="size-4" />
      </Button>
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) syncPath()
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Switch language"
          title={active?.text ?? 'Switch language'}
          className={className}
        >
          <Globe className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <ul className="flex flex-col">
          {locales.map(({ locale: target, text }) => {
            const isActive = target === locale
            return (
              <li key={target}>
                <a
                  href={computeLangSwitchUrl(
                    path,
                    target,
                    EXISTENCE,
                    splitLocale,
                  )}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive && 'font-medium text-primary',
                  )}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span>{text}</span>
                  {isActive ? <Check className="size-4" /> : null}
                </a>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
