// AlmiCELPIP-branded header — own wordmark + the family sibling nav + product entry
// points. Desktop uses the grouped 2-row layout (Nav Task 1): row 1 = family strip
// (canonical names, overflow behind "More ▾"), row 2 = product links + CTA. Family
// labels come from the canonical single source (src/lib/nav/family.ts).

import Link from "next/link";
import { familyStrip } from "@/lib/nav/family";
import { FamilyNav } from "./nav/FamilyNav";
import { HeaderMobileMenu } from "./HeaderMobileMenu";

// The family strip for this repo = every product except AlmiCELPIP (its own brand
// wordmark is CELPIP's home) + the network links. Sourced from the canonical list.
export const FAMILY_NAV = familyStrip("celpip");

// Product entry points into AlmiCELPIP's own practice product.
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

        {/* Desktop: grouped 2-row — family strip on top, product actions below. */}
        <div className="hidden flex-1 flex-col items-end gap-2 lg:flex">
          <FamilyNav items={FAMILY_NAV} />
          <div className="flex items-center gap-x-4">
            {PRODUCT_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-sm text-base font-semibold text-almi-ink hover:text-almi-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-almi-coral focus-visible:ring-offset-2 focus-visible:ring-offset-almi-bg"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={GET_STARTED_HREF}
              className="inline-flex min-h-[40px] items-center justify-center bg-almi-coral px-5 py-2 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-almi-coral/30"
              style={{ borderRadius: 9999 }}
            >
              Start practising free
            </Link>
          </div>
        </div>

        <div className="lg:hidden">
          <HeaderMobileMenu />
        </div>
      </div>
    </header>
  );
}
