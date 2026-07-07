"use client";

// Grouped 2-row family nav (AlmiWorld Nav Task 1). Row 1 = a fixed set of primary
// family links inline + a "More ▾" overflow dropdown holding the rest; Row 2 (owned
// by the header) = product links + CTA. This guarantees the family strip is exactly
// ONE row at ≥1024px regardless of how many siblings exist, so the header holds the
// 2-row grouped layout without wrapping into a 3rd row (Nav Task 1 constraint a).
//
// Labels come from the canonical single source (src/lib/nav/family.ts) — this
// component never hard-codes a product name. Typography standard: link text bold
// (600) + one step larger (text-base). A current-product link (activeHref) is marked
// with the accent color, NOT weight, so it stays distinct once all links are bold.

import { useEffect, useId, useRef, useState } from "react";
import type { NavLink } from "@/lib/nav/family";

const LINK_BASE =
  "rounded-sm text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-almi-coral focus-visible:ring-offset-2 focus-visible:ring-offset-almi-bg";

export function FamilyNav({
  items,
  primaryCount = 7,
  activeHref,
}: {
  items: readonly NavLink[];
  primaryCount?: number;
  activeHref?: string;
}) {
  const primary = items.slice(0, primaryCount);
  const overflow = items.slice(primaryCount);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Close on Escape or a click outside the More control/menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const linkClass = (href: string) =>
    `${LINK_BASE} ${href === activeHref ? "text-almi-coral" : "text-almi-text hover:text-almi-coral"}`;

  return (
    <nav aria-label="Family navigation" className="flex items-center justify-end gap-x-4">
      {primary.map((item) => (
        <a key={item.href} href={item.href} className={linkClass(item.href)}>
          {item.label}
        </a>
      ))}

      {overflow.length > 0 && (
        <div ref={wrapRef} className="relative">
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
            className={`${LINK_BASE} inline-flex items-center gap-1 text-almi-text hover:text-almi-coral`}
          >
            More
            <svg aria-hidden viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
              <path d="M5.5 7.5L10 12l4.5-4.5z" />
            </svg>
          </button>

          {open && (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 grid w-max grid-cols-2 gap-x-6 gap-y-1 rounded-xl border border-almi-bg-peach bg-almi-bg p-3 shadow-lg"
            >
              {overflow.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-base font-semibold ${
                    item.href === activeHref
                      ? "text-almi-coral"
                      : "text-almi-text hover:bg-almi-bg-peach hover:text-almi-coral"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
