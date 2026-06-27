"use client";

// A single sidebar nav link: icon + label, with coral active highlight.
// Active state is computed by the parent (so two links to the same route
// don't both light up) and passed in.

import Link from "next/link";

export function SidebarItem({
  href,
  icon,
  label,
  active,
  onNavigate,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
        (active
          ? "bg-almi-coral text-almi-ink"
          : "text-almi-text hover:bg-almi-bg-peach/60")
      }
    >
      <span aria-hidden className="w-5 text-center text-base leading-none">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
