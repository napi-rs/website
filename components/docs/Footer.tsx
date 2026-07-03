// Footer — site footer.
//
// Left: Logo + MIT license line + copyright (render-time year).
// Right: the "Built with Void" attribution link (https://void.cloud). The
//        previous Nextra/Vercel attributions are intentionally NOT carried over
//        (we migrated off them); the "UI inspired by Vite" credit was dropped
//        after Vite redesigned their homepage.
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
        'mx-auto w-full max-w-[1400px] px-6 py-10 text-sm text-muted-foreground',
        className,
      )}
    >
      {/* Landing only: the language switcher is its OWN top control zone with a
          divider, matching live napi.rs (which sits the locale/theme controls in
          a bordered top row, well clear of the brand block below). Stacking it
          tight above the logo made the small globe's label ("English") sit
          visibly out of line with the larger logo's wordmark ("NAPI-RS") — a
          16px stagger, since the globe is 16px and the logo 32px at the same
          icon->label gap. A dedicated, divided zone removes that entirely.
          Docs pass no locale and skip this (their switcher lives in the sidebar
          chrome), so the divider only ever renders in the dark landing footer. */}
      {locale ? (
        <div className="mb-8 border-b border-border pb-6">
          {/* -ml-2.5 cancels the labeled button's left padding (size=sm +
              has-[>svg] -> px-2.5) so the globe sits flush-left with the Logo. */}
          <LangSwitcher locale={locale} showLabel className="-ml-2.5" />
        </div>
      ) : null}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
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
        </div>
      </div>
    </div>
  )
}
