// AlmiCELPIP-branded header — own wordmark + product entry points + the family
// sibling nav (like AlmiCV's site header). The brand links home; the family
// links keep AlmiCELPIP connected to the rest of AlmiWorld.

import Link from "next/link";
import { HeaderMobileMenu } from "./HeaderMobileMenu";

export const FAMILY_NAV = [
  { label: "Home", href: "https://almiworld.com/" },
  { label: "eBooks", href: "https://almiworld.com/ebooks-2/" },
  { label: "Almijobs", href: "https://almijob.almiworld.com/" },
  { label: "Salary Checker", href: "https://almisalary.almiworld.com" },
  { label: "Almi CV", href: "https://almicv.almiworld.com" },
  { label: "Almistudy", href: "https://almistudy.almiworld.com/" },
  { label: "AlmiPrep", href: "https://almiprep.almiworld.com/" },
  { label: "AlmiPTE", href: "https://almipte.almiworld.com/" },
  { label: "AlmiTOEFL", href: "https://almitoefl.almiworld.com/" },
  { label: "AlmiOET", href: "https://almioet.almiworld.com/" },
  { label: "AlmiDET", href: "https://almidet.almiworld.com/" },
  { label: "AlmiCELPIP", href: "https://almicelpip.almiworld.com/" },
  { label: "AlmiGoethe", href: "https://almigoethe.almiworld.com/" },
  { label: "AlmiFrench", href: "https://almifrench.almiworld.com/" },
  { label: "AlmiSpanish", href: "https://almispanish.almiworld.com/" },
  { label: "AlmiJapanese", href: "https://almijapanese.almiworld.com/" },
  { label: "Contact Us", href: "https://almiworld.com/contact-us/" },
  { label: "Shamool Foundation", href: "https://shamoolfoundation.com/" },
] as const;

// Product entry points (distinct from the family sibling links above). These
// take a visitor from any page into AlmiCELPIP's own practice product.
export const PRODUCT_NAV = [
  { label: "Practice", href: "/practice" },
  { label: "Log in", href: "/login" },
] as const;

// Primary CTA → create an account and start practising.
export const GET_STARTED_HREF = "/signup";

export function GlobalHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-almi-bg-peach bg-almi-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          aria-label="AlmiCELPIP home"
          className="inline-flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-almi-coral focus-visible:ring-offset-2 focus-visible:ring-offset-almi-bg"
        >
          <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-lg bg-almi-coral text-lg font-bold text-white">A</span>
          <span className="text-xl font-semibold tracking-tight text-almi-ink">AlmiCELPIP</span>
        </Link>

        <nav
          aria-label="Family navigation"
          className="hidden flex-1 items-center justify-end gap-x-5 gap-y-2 text-sm lg:flex lg:flex-wrap"
        >
          {FAMILY_NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-sm text-almi-text hover:text-almi-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-almi-coral focus-visible:ring-offset-2 focus-visible:ring-offset-almi-bg"
            >
              {item.label}
            </a>
          ))}
          {PRODUCT_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm font-medium text-almi-ink hover:text-almi-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-almi-coral focus-visible:ring-offset-2 focus-visible:ring-offset-almi-bg"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={GET_STARTED_HREF}
            className="ml-2 inline-flex min-h-[40px] items-center justify-center bg-almi-coral px-5 py-2 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-almi-coral/30"
            style={{ borderRadius: 9999 }}
          >
            Start practising free
          </Link>
        </nav>

        <div className="lg:hidden">
          <HeaderMobileMenu />
        </div>
      </div>
    </header>
  );
}
