"use client";

// Family nav (AlmiWorld Nav Task 1). ALL family links render inline as real <a>
// anchors and wrap naturally onto 2–3 rows via flex-wrap — no "More" dropdown, no
// truncation, nothing hidden behind client state. The family strip is fully visible
// and crawlable in the initial HTML.
//
// Labels come from the canonical single source (src/lib/nav/family.ts) — this
// component never hard-codes a product name. Typography standard: link text bold
// (600) + one step larger (text-base). A current-product link (activeHref) is marked
// with the accent color, NOT weight, so it stays distinct once all links are bold.

import type { NavLink } from "@/lib/nav/family";

const LINK_BASE =
  "rounded-sm text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-almi-coral focus-visible:ring-offset-2 focus-visible:ring-offset-almi-bg";

export function FamilyNav({
  items,
  activeHref,
}: {
  items: readonly NavLink[];
  activeHref?: string;
}) {
  const linkClass = (href: string) =>
    `${LINK_BASE} ${href === activeHref ? "text-almi-coral" : "text-almi-text hover:text-almi-coral"}`;

  return (
    <nav
      aria-label="Family navigation"
      className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1"
    >
      {items.map((item) => (
        <a key={item.href} href={item.href} className={linkClass(item.href)}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
