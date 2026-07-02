// Footer — site footer.
//
// Left: Logo + MIT license line + copyright (render-time year).
// Right: attribution links — "Built with Void" (https://void.cloud) and
//        "UI inspired by Vite" (https://vite.dev). The previous Nextra/Vercel
//        attributions are intentionally NOT carried over (we migrated off them).
//
// Language control: the LANDING has no sidebar to hold a language switcher, so it
// lives in the footer there. This renders it ONLY when a `locale` is passed — the
// LANDING entries import this `with { island: 'load' }` and pass a locale (so
// LangSwitcher hydrates as this island's child); the docs layout renders the
// footer as a plain static slot WITHOUT a locale.
//
// There is intentionally NO theme control here: the home/landing pages are
// dark-always, so there is no theme choice to offer. docs/blog/changelog carry the
// theme switch in their sidebar/navbar chrome instead (see DocsLayout).
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/nav/index.ts'
import Logo from './Logo.tsx'
import LangSwitcher from './LangSwitcher'

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
            {/* -ml-2.5 cancels the labeled button's left padding (size=sm +
                has-[>svg] -> px-2.5) so the globe icon sits flush-left, aligned
                with the Logo + license text stacked below it. */}
            <LangSwitcher locale={locale} showLabel className="-ml-2.5" />
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
