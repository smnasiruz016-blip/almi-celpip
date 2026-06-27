"use client";

// Hamburger menu for screens below lg. Mirrors the desktop nav exactly —
// same items, same hrefs, same "Get Started" CTA. Closes on link click or
// Esc.

import { useEffect, useState } from "react";
import Link from "next/link";
import { FAMILY_NAV, PRODUCT_NAV, GET_STARTED_HREF } from "./GlobalHeader";

export function HeaderMobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll while open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="global-mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-almi-ink/15 text-almi-ink hover:border-almi-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-almi-coral"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {open ? (
            <>
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </>
          ) : (
            <>
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div
          id="global-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Family navigation"
          className="fixed inset-0 top-[64px] z-40 overflow-y-auto bg-almi-bg"
        >
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-base">
            {FAMILY_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-almi-text hover:bg-almi-bg-peach hover:text-almi-coral"
              >
                {item.label}
              </a>
            ))}
            <div className="my-2 border-t border-almi-bg-peach" />
            {PRODUCT_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 font-medium text-almi-ink hover:bg-almi-bg-peach hover:text-almi-coral"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={GET_STARTED_HREF}
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex min-h-[48px] items-center justify-center rounded-pill bg-almi-coral px-5 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep"
              style={{ borderRadius: 9999 }}
            >
              Start practising free
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
