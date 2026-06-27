"use server";

// Comp Pro grants — admin-only. A comp gives an existing user full Pro access
// (AI feedback on Write/Speak About the Photo + the full-length mock) without
// Stripe, with an expiry. Single grant per user: grant refuses if one is
// already active (use Extend), revoke nulls all fields. Every action re-gates
// on ADMIN_EMAILS (defense in depth — the /admin layout also gates).

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/founder";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 1825; // 5 years

type ActionResult = { ok: boolean; error?: string };

async function gate(): Promise<{ ok: boolean; adminEmail: string }> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) return { ok: false, adminEmail: "" };
  return { ok: true, adminEmail: user.email };
}

function validDays(n: number): boolean {
  return Number.isFinite(n) && n >= 1 && n <= MAX_DAYS;
}

export async function grantCompPro(input: {
  email: string;
  days: number;
  reason?: string;
}): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: "Not authorized" };

  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, error: "Email is required" };
  const days = Math.floor(input.days);
  if (!validDays(days)) return { ok: false, error: `Days must be 1–${MAX_DAYS}` };

  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) {
    return { ok: false, error: `No user with email ${email} — they must sign up first.` };
  }
  if (target.compProUntil && target.compProUntil.getTime() > Date.now()) {
    return { ok: false, error: "An active comp already exists — use Extend instead." };
  }

  const now = new Date();
  await prisma.user.update({
    where: { id: target.id },
    data: {
      compProUntil: new Date(now.getTime() + days * DAY_MS),
      compGrantedAt: now,
      compGrantedBy: g.adminEmail,
      compReason: input.reason?.trim() || null,
    },
  });
  revalidatePath("/admin/comp-accounts");
  return { ok: true };
}

export async function revokeCompPro(input: { userId: string }): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: "Not authorized" };

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      compProUntil: null,
      compGrantedAt: null,
      compGrantedBy: null,
      compReason: null,
    },
  });
  revalidatePath("/admin/comp-accounts");
  return { ok: true };
}

export async function extendCompPro(input: {
  userId: string;
  additionalDays: number;
}): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: "Not authorized" };

  const days = Math.floor(input.additionalDays);
  if (!validDays(days)) return { ok: false, error: "Invalid number of days" };

  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!target) return { ok: false, error: "User not found" };

  // Top up from whichever is later: now, or the current (still-active) expiry.
  const base =
    target.compProUntil && target.compProUntil.getTime() > Date.now()
      ? target.compProUntil.getTime()
      : Date.now();
  await prisma.user.update({
    where: { id: target.id },
    // Preserve the original grantedAt / grantedBy / reason.
    data: { compProUntil: new Date(base + days * DAY_MS) },
  });
  revalidatePath("/admin/comp-accounts");
  return { ok: true };
}

export type CompRow = {
  userId: string;
  email: string;
  name: string | null;
  grantedAt: string | null;
  expiresAt: string;
  reason: string | null;
  grantedBy: string | null;
  isActive: boolean;
  daysRemaining: number | null;
};

export async function listCompAccounts(): Promise<{
  active: CompRow[];
  expired: CompRow[];
}> {
  const rows = await prisma.user.findMany({
    where: { compProUntil: { not: null } },
    orderBy: { compProUntil: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      compGrantedAt: true,
      compProUntil: true,
      compReason: true,
      compGrantedBy: true,
    },
  });

  const now = Date.now();
  const mapped: CompRow[] = rows.map((r) => {
    const untilMs = r.compProUntil!.getTime();
    const isActive = untilMs > now;
    return {
      userId: r.id,
      email: r.email,
      name: r.name,
      grantedAt: r.compGrantedAt ? r.compGrantedAt.toISOString() : null,
      expiresAt: r.compProUntil!.toISOString(),
      reason: r.compReason,
      grantedBy: r.compGrantedBy,
      isActive,
      daysRemaining: isActive ? Math.ceil((untilMs - now) / DAY_MS) : null,
    };
  });

  return {
    active: mapped.filter((m) => m.isActive),
    expired: mapped.filter((m) => !m.isActive),
  };
}
