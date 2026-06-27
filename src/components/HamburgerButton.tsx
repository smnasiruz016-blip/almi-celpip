"use client";

// Mobile-only menu toggle. Presentational — the open/close state lives in
// <Sidebar>.

export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open navigation menu"
      className="flex h-9 w-9 items-center justify-center rounded-md border border-almi-bg-peach text-lg text-almi-ink hover:bg-almi-bg-peach/60"
    >
      <span aria-hidden>☰</span>
    </button>
  );
}
