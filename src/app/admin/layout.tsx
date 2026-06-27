// Admin panel shell. Gated on ADMIN_EMAILS (isAdmin); noindex. Each server
// action re-gates too (defense in depth). Standalone route — uses the family
// GlobalHeader/Footer from the root layout, with its own subnav.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/founder";
import { AdminSubnav } from "./_components/AdminSubnav";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) redirect("/");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">AlmiCELPIP</p>
          <h1 className="text-2xl font-semibold text-almi-ink">Admin</h1>
        </div>
        <Link href="/account" className="text-sm font-medium text-almi-coral hover:underline">
          ← Account
        </Link>
      </div>
      <AdminSubnav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
