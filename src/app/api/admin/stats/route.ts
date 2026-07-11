import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Owner-only network stats for AlmiWorld HQ. Read-only, this app's OWN DB only.
// Guarded by ADMIN_API_SECRET (header x-admin-secret) — FAIL-CLOSED: if the
// secret is unset the endpoint always 401s, so it is never open by default.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const d7 = new Date(now.getTime() - 7 * 864e5);
  const d30 = new Date(now.getTime() - 30 * 864e5);

  const [accounts, today, s7, s30, trialing, paid] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startToday } } }),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.user.count({
      where: {
        subscriptionStatus: "trialing",
        OR: [{ compProUntil: null }, { compProUntil: { lte: now } }],
      },
    }),
    prisma.user.count({
      where: { OR: [{ subscriptionStatus: "active" }, { compProUntil: { gt: now } }] },
    }),
  ]);

  return NextResponse.json({
    accounts,
    signups: { today, d7: s7, d30: s30 },
    trialing,
    paid,
    free: Math.max(0, accounts - trialing - paid),
    asOf: now.toISOString(),
  });
}
