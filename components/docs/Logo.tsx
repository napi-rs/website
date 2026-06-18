// Logo — the NAPI-RS brand mark used in the Navbar and Footer.
//
// Static-safe: pure presentational, no hooks, no interactivity. Renders inside
// island chrome (Navbar) AND static chrome (Footer); it must never assume a
// client context, so it is just an <img> + text span. The caller decides
// whether to wrap it in a link.
//
// Spec: /img/favicon.png at 32px + "NAPI-RS" 16px text. Accepts className so the
// Footer can tune spacing/sizing independently of the Navbar.
import { cn } from '@/lib/utils'

export interface LogoProps {
  className?: string
}

export default function Logo({ className }: LogoProps) {
  return (
    <span className={cn('flex items-center gap-2 font-semibold', className)}>
      <img
        src="/img/favicon.png"
        alt="NAPI-RS"
        width={32}
        height={32}
        className="size-8 shrink-0"
      />
      <span className="text-base leading-none">NAPI-RS</span>
    </span>
  )
}
