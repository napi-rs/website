// ThemeToggle — Sun/Moon switch that flips BOTH theme signals at once.
//
// Dark mode is dual-signal in this app (see contract.styling):
//   • Tailwind keys off the `.dark` class on <html> (@custom-variant dark).
//   • @void/md keys off `[data-theme="dark"]` on <html>.
// The pre-paint bootstrap (middleware/01.head.ts) sets both before first paint
// from localStorage('theme') (+ prefers-color-scheme). This toggle keeps them in
// lockstep and persists the user's explicit choice back to localStorage('theme').
//
// Island note: this lives inside the Navbar island ('load'). It must not render a
// theme-dependent icon on the SERVER (the server has no localStorage), or React
// will warn about a hydration mismatch. So we render a stable placeholder until
// mounted, then read the live DOM state (which the bootstrap already set
// correctly) and show the matching icon.
import * as React from 'react'
import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'

function currentIsDark(): boolean {
  if (typeof document === 'undefined') return true
  return document.documentElement.classList.contains('dark')
}

function applyTheme(isDark: boolean) {
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
  root.setAttribute('data-theme', isDark ? 'dark' : 'light')
  try {
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  } catch {
    // localStorage can throw in private mode / disabled storage — ignore.
  }
}

export interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const [mounted, setMounted] = React.useState(false)
  const [isDark, setIsDark] = React.useState(true)

  React.useEffect(() => {
    setIsDark(currentIsDark())
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = !currentIsDark()
    applyTheme(next)
    setIsDark(next)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className={className}
    >
      {/*
        Until mounted, render a neutral icon to keep SSR/CSR markup identical.
        After mount we reflect the real DOM theme. `suppressHydrationWarning`
        guards the icon swap.
      */}
      {/* flex-center the icon so it sits on the button's vertical center in ALL
          browsers. A plain inline <span> centers the svg via vertical-align
          against the 20px line-box, which Chromium collapses to the icon height
          but Safari/Firefox render ~2-4px low — visibly off from the sibling
          LangSwitcher (whose globe is a direct flex child). */}
      <span
        suppressHydrationWarning
        className="flex items-center justify-center"
      >
        {mounted && !isDark ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )}
      </span>
    </Button>
  )
}
