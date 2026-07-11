"use client";

// Left navigation for all logged-in app pages. Desktop: a fixed full-height
// rail (the main content gets md:ml-60). Mobile: collapsed to a hamburger
// that opens a slide-in drawer with a backdrop; body scroll locks while open.
//
// "Choose a Test" is the user-facing label for /practice (the URL is
// unchanged). The Admin item only renders for ADMIN_EMAILS users. Active
// highlighting is computed centrally so the two /account links (My Progress
// + Account) don't both light up.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarItem } from "@/components/SidebarItem";
import { HamburgerButton } from "@/components/HamburgerButton";

type Item = { key: string; href: string; icon: string; label: string; match: string };

function buildItems(isAdmin: boolean): Item[] {
  const items: Item[] = [
    { key: "home", href: "/", icon: "🏠", label: "Home", match: "/" },
    { key: "practice", href: "/practice", icon: "✏️", label: "Choose a Test", match: "/practice" },
    { key: "progress", href: "/account", icon: "📊", label: "My Progress", match: "/account" },
    { key: "account", href: "/account", icon: "👤", label: "Account", match: "/account" },
  ];
  // Admin panel (Comp Accounts + Accounts) — only for ADMIN_EMAILS users.
  if (isAdmin) {
    items.push({ key: "admin", href: "/admin", icon: "🛠️", label: "Admin", match: "/admin" });
    items.push({ key: "reviews", href: "/admin/reviews", icon: "⭐", label: "Reviews", match: "/admin/reviews" });
  }
  return items;
}

// Longest matching prefix wins; ties keep the first item (so "My Progress"
// owns /account and "Account" stays unhighlighted rather than both lighting).
function activeKey(pathname: string, items: Item[]): string | null {
  let best: string | null = null;
  let bestLen = -1;
  for (const it of items) {
    const m = it.match;
    const hit = m === "/" ? pathname === "/" : pathname === m || pathname.startsWith(m + "/");
    if (hit && m.length > bestLen) {
      best = it.key;
      bestLen = m.length;
    }
  }
  return best;
}

function NavBody({
  items,
  active,
  email,
  logout,
  onNavigate,
}: {
  items: Item[];
  active: string | null;
  email: string;
  logout: () => Promise<void>;
  onNavigate?: () => void;
}) {
  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {items.map((it) => (
          <SidebarItem
            key={it.key}
            href={it.href}
            icon={it.icon}
            label={it.label}
            active={active === it.key}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="mt-3 border-t border-almi-bg-peach pt-3">
        <p className="truncate px-3 pb-2 text-xs text-almi-text-muted" title={email}>
          {email}
        </p>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-almi-coral-deep hover:bg-almi-coral/10"
          >
            <span aria-hidden className="w-5 text-center text-base leading-none">🚪</span>
            <span>Log out</span>
          </button>
        </form>
      </div>
    </>
  );
}

export function Sidebar({
  email,
  isAdmin,
  logout,
}: {
  email: string;
  isAdmin: boolean;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = buildItems(isAdmin);
  const active = activeKey(pathname, items);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar (below the family header) */}
      <div className="flex items-center gap-3 border-b border-almi-bg-peach bg-almi-paper px-4 py-3 md:hidden">
        <HamburgerButton onClick={() => setOpen(true)} />
        <span className="text-sm font-semibold leading-tight text-almi-ink">AlmiCELPIP</span>
      </div>

      {/* Desktop fixed rail. The family header is sticky with a variable
          height: ~64px at md (nav collapsed to a hamburger) but its 11-item
          lg:flex-wrap nav wraps to 2-3 lines at lg+, growing to ~100px. The
          rail is pinned at the fixed 64px top-16 offset, so the top padding has
          to clear the *worst-case* header — hence responsive padding that stays
          modest at md and opens up at lg+ where the header actually grows. */}
      <aside className="fixed bottom-0 left-0 top-16 z-30 hidden w-60 flex-col border-r border-almi-bg-peach bg-almi-paper px-3 pb-4 pt-8 md:flex lg:pt-16">
        <p className="px-3 pb-4 text-base font-semibold leading-tight text-almi-ink">AlmiCELPIP</p>
        <NavBody items={items} active={active} email={email} logout={logout} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="tt-fade-in absolute inset-0 bg-almi-ink/40" aria-hidden onClick={() => setOpen(false)} />
          <aside className="tt-slide-in-left absolute inset-y-0 left-0 flex w-64 max-w-[82%] flex-col border-r border-almi-bg-peach bg-almi-paper px-3 pb-4 pt-6 shadow-xl">
            <div className="flex items-center justify-between px-3 pb-4">
              <span className="text-base font-semibold leading-tight text-almi-ink">AlmiCELPIP</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-full text-almi-text-muted hover:bg-almi-bg-peach hover:text-almi-ink"
              >
                <span aria-hidden className="text-xl leading-none">&times;</span>
              </button>
            </div>
            <NavBody
              items={items}
              active={active}
              email={email}
              logout={logout}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}
