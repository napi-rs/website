// Footer — STATIC site footer. Not an island.
//
// Left: Logo + MIT license line + copyright (render-time year).
// Right: attribution links — "Built with Void" (https://void.cloud) and
//        "UI inspired by Vite" (https://vite.dev). The previous Nextra/Vercel
//        attributions are intentionally NOT carried over.
import { cn } from '@/lib/utils'
import Logo from './Logo.tsx'

export interface FooterProps {
  className?: string
}

export default function Footer({ className }: FooterProps) {
  const year = new Date().getFullYear()

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
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
