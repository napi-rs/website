// ThemeSwitch — Light / Dark / System selector (matches live napi.rs, whose
// Nextra theme control is a 3-option listbox, NOT a binary toggle).
//
// Dark mode is dual-signal in this app:
//   • Tailwind keys off the `.dark` class on <html> (@custom-variant dark).
//   • @void/md keys off `[data-theme="dark"]` on <html>.
// The pre-paint bootstrap (middleware/01.head.ts) resolves the SAME three modes
// before first paint, sets both signals, AND owns the live "follow system"
// listener — so a mid-session OS light/dark switch re-applies on every page, even
// where no toggle island is mounted (e.g. a closed mobile drawer). This component
// only persists the chosen MODE ('light' | 'dark' | 'system') to
// localStorage('theme') and applies it on selection; the trigger shows the mode's
// icon (sun / moon / monitor).
//
// Default when unset is SYSTEM — a first-time visitor follows the OS
// `prefers-color-scheme`. (The home/landing pages have no theme control at all;
// they are dark-always.)
//
// Island note: this lives inside the Navbar island ('load'). It must not render a
// preference-dependent icon on the SERVER (no localStorage there) or React warns
// about a hydration mismatch — so it renders a stable placeholder until mounted,
// then reads the saved mode. The Radix Popover is likewise deferred to the client
// (its useId() differs SSR vs island root), mirroring LangSwitcher.
import * as React from 'react'
import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type ThemeMode = 'light' | 'dark' | 'system'

const MODES: { mode: ThemeMode; label: string; Icon: LucideIcon }[] = [
  { mode: 'light', label: 'Light', Icon: Sun },
  { mode: 'dark', label: 'Dark', Icon: Moon },
  { mode: 'system', label: 'System', Icon: Monitor },
]

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches

/** Resolve a mode to a concrete dark boolean. */
function isDarkFor(mode: ThemeMode): boolean {
  return mode === 'system' ? prefersDark() : mode === 'dark'
}

/** Saved mode; default 'system' (first visit follows the OS). */
function savedMode(): ThemeMode {
  try {
    const t = localStorage.getItem('theme')
    if (t === 'light' || t === 'dark' || t === 'system') return t
  } catch {
    // localStorage can throw in private mode — fall through to the default.
  }
  return 'system'
}

/** Apply a mode to BOTH theme signals on <html> (keeps Tailwind + @void/md in sync). */
function applyMode(mode: ThemeMode) {
  const dark = isDarkFor(mode)
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.setAttribute('data-theme', dark ? 'dark' : 'light')
}

export interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const [mounted, setMounted] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  // Initial state matches the unset default ('system'); reconciled to the saved
  // mode on mount so SSR and the first client render are identical. Live OS
  // changes are handled by the bootstrap listener, not here.
  const [mode, setMode] = React.useState<ThemeMode>('system')

  React.useEffect(() => {
    setMode(savedMode())
    setMounted(true)
  }, [])

  const select = (next: ThemeMode) => {
    try {
      localStorage.setItem('theme', next)
    } catch {
      // ignore storage failures — the in-page theme still applies below.
    }
    applyMode(next)
    setMode(next)
    setOpen(false)
  }

  const CurrentIcon = MODES.find((m) => m.mode === mode)?.Icon ?? Moon

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Change theme"
      title="Change theme"
      // Match the 32px labeled LangSwitcher it always sits beside (landing
      // footer / docs sidebar footer / mobile drawer).
      className={cn('size-8', className)}
    >
      {/* flex-center the icon (cross-browser; a plain inline span centers the
          svg via vertical-align, which Safari/Firefox render a few px low). */}
      <span
        suppressHydrationWarning
        className="flex items-center justify-center"
      >
        <CurrentIcon className="size-4" />
      </span>
    </Button>
  )

  // Pre-mount (SSR + first client render): a plain trigger, no Popover — so the
  // markup is identical on both sides and Radix's useId() never runs on the
  // server. The icon swap after mount is guarded by suppressHydrationWarning.
  if (!mounted) return trigger

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-40 p-1">
        <ul className="flex flex-col">
          {MODES.map(({ mode: m, label, Icon }) => {
            const active = m === mode
            return (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => select(m)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm',
                    'hover:bg-accent hover:text-accent-foreground',
                    active && 'font-medium text-primary',
                  )}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-4" />
                    {label}
                  </span>
                  {active ? <Check className="size-4" /> : null}
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
