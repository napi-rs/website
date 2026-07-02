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

export interface NotTranslatedBannerProps {
  locale: Locale
  /** Whether the current page is served via the i18n fallback (en content). */
  fallback?: boolean
  className?: string
}

const MESSAGE: Record<Locale, string> = {
  // en never falls back to itself, but keep a sane string for completeness.
  en: 'This page has not been translated yet. Showing the English version.',
  cn: '本页面尚未翻译，当前显示的是英文版本。',
  'pt-BR': 'Esta página ainda não foi traduzida. Exibindo a versão em inglês.',
}

export default function NotTranslatedBanner({
  locale,
  fallback,
  className,
}: NotTranslatedBannerProps) {
  if (!fallback) return null

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
      <span>{MESSAGE[locale]}</span>
    </div>
  )
}
