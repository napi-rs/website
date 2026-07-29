// NotTranslatedBanner — shows when the active page is served via the i18n
// fallback (the requested locale has no translation, so the English page is
// shown instead). The fallback flag is set by middleware/02.i18n-fallback.ts.
//
// ISLAND: 'load'. The layout.island.tsx entry imports it `with { island: 'load' }`
// and passes the `fallback` flag as a PROP. We deliberately do NOT call
// useShared() here: island components hydrate WITHOUT a SharedContext provider
// (see node_modules/@void/react/dist/plugin.mjs `hydrateIsland`:
// `hydrateRoot(el, createElement(Component, props))` — no providers), so
// useShared() would throw on the client. The layout reads useShared().i18nFallback
// at SSR (where SharedContext IS wired) and threads it down as `fallback`, which
// is serialized into the island's data-props and available on hydration.
// Render-only: no <Link>/useForm.
import { Languages } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/nav/index.ts'
import { splitLocale } from '@/lib/docs/locale.ts'

export interface NotTranslatedBannerProps {
  locale: Locale
  /** Whether the current page is served via the i18n fallback (en content). */
  fallback?: boolean
  /**
   * Current ROUTE path — used to prefill the "help translate" issue title with
   * the page's content leaf. Passed by the layout (from `useShared().path`).
   */
  currentPath?: string
  className?: string
}

const MESSAGE: Record<Locale, string> = {
  // en never falls back to itself, but keep a sane string for completeness.
  en: 'This page has not been translated yet. Showing the English version.',
  cn: '本页面尚未翻译，当前显示的是英文版本。',
  'pt-BR': 'Esta página ainda não foi traduzida. Exibindo a versão em inglês.',
}

const CTA: Record<Locale, string> = {
  en: 'Help translate this page →',
  cn: '帮助翻译本页 →',
  'pt-BR': 'Ajude a traduzir esta página →',
}

// The CTA opens a prefilled "translation" GitHub issue. GitHub's /new-file and
// /edit URLs can't prefill path+content reliably (and /edit 404s when the
// localized file doesn't exist — which is exactly the case here), so an issue
// is the only robust contribution entry point.
function translateUrl(rest: string, locale: Locale): string {
  const params = new URLSearchParams({
    labels: 'translation',
    title: `Translation: ${rest} (${locale})`,
  })
  return `https://github.com/napi-rs/website/issues/new?${params.toString()}`
}

export default function NotTranslatedBanner({
  locale,
  fallback,
  currentPath,
  className,
}: NotTranslatedBannerProps) {
  if (!fallback) return null

  const [, rest] = splitLocale(currentPath ?? '')

  return (
    <div
      role="note"
      className={cn(
        'mb-6 flex items-start gap-2.5 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground',
        className,
      )}
    >
      <Languages
        className="mt-0.5 size-4 shrink-0 text-primary"
        aria-hidden="true"
      />
      <span>
        {MESSAGE[locale]}{' '}
        {rest ? (
          <a
            href={translateUrl(rest, locale)}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
          >
            {CTA[locale]}
          </a>
        ) : null}
      </span>
    </div>
  )
}
