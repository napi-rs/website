// Footer — site footer.
//
// Left: Logo + MIT license line + copyright (render-time year).
// Right: attribution links — "Built with Void" (https://void.cloud) and
//        "UI inspired by Vite" (https://vite.dev). The previous Nextra/Vercel
//        attributions are intentionally NOT carried over (we migrated off them).
//
// Theme + language controls: live napi.rs shows these in the footer ON THE
// LANDING (which has no sidebar to hold them); on docs they live in the sidebar
// footer instead. So this component renders the toggles ONLY when a `locale` is
// passed — the LANDING entries import this `with { island: 'load' }` and pass a
// locale (so ThemeToggle/LangSwitcher hydrate as this island's children), while
// the docs layout renders it as a plain static slot WITHOUT a locale (no toggles).
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/nav/index.ts'
import Logo from './Logo.tsx'
import LangSwitcher from './LangSwitcher'
import ThemeToggle from './ThemeToggle'

export interface FooterProps {
  /**
   * When set, the footer renders the language + theme toggles (landing context).
   * Omit on docs — the sidebar footer carries them there, matching live.
   */
  locale?: Locale
  className?: string
}

export default function Footer({ locale, className }: FooterProps) {
  const year = new Date().getFullYear()

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        {locale ? (
          <div className="mb-1 flex items-center gap-1">
            <LangSwitcher locale={locale} showLabel />
            <ThemeToggle />
          </div>
        ) : null}
        <Logo />
        <p>Released under the MIT License.</p>
        <p>Copyright © {year} NAPI-RS.</p>
      </div>

      <div className="flex flex-col gap-2 sm:items-end">
        <a
          href="https://void.cloud"
          target="_blank"
          rel="noreferrer noopener"
          className="transition-colors hover:text-primary"
        >
          Built with Void
        </a>
        <a
          href="https://vite.dev"
          target="_blank"
          rel="noreferrer noopener"
          className="transition-colors hover:text-primary"
        >
          UI inspired by Vite
        </a>
      </div>
    </div>
  )
}
