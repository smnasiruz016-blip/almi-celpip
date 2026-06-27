// Accounts tab: the 20 most-recent users with plan badge + last-active, plus
// totals. Last-active is derived from the newest session's expiry minus the
// 30-day session duration (no lastActiveAt field on User), or updatedAt.

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

type Plan = "comp" | "pro" | "free";

function classifyPlan(u: {
  compProUntil: Date | null;
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: Date | null;
}): Plan {
  const now = Date.now();
  if (u.compProUntil && u.compProUntil.getTime() > now) return "comp";
  if (
    u.subscriptionStatus &&
    (u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing") &&
    u.subscriptionCurrentPeriodEnd &&
    u.subscriptionCurrentPeriodEnd.getTime() > now
  ) {
    return "pro";
  }
  return "free";
}

function lastActive(sessionExpires: Date | undefined, updatedAt: Date): Date {
  if (!sessionExpires) return updatedAt;
  const derived = new Date(sessionExpires.getTime() - SESSION_DURATION_MS);
  return derived.getTime() > updatedAt.getTime() ? derived : updatedAt;
}

const PLAN_BADGE: Record<Plan, { label: string; cls: string }> = {
  comp: { label: "🎁 Comp", cls: "bg-almi-accent/15 text-almi-accent-deep" },
  pro: { label: "Pro", cls: "bg-almi-teal/15 text-almi-teal" },
  free: { label: "Free", cls: "bg-almi-bg-peach text-almi-text-muted" },
};

export default async function AccountsPage() {
  const nowDate = new Date();
  const [users, total, compCount, proCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
        compProUntil: true,
        sessions: { orderBy: { expiresAt: "desc" }, take: 1, select: { expiresAt: true } },
      },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { compProUntil: { gt: nowDate } } }),
    prisma.user.count({
      where: {
        subscriptionStatus: { in: ["active", "trialing"] },
        subscriptionCurrentPeriodEnd: { gt: nowDate },
        // Exclude comped users so they aren't double-counted as Pro.
        OR: [{ compProUntil: null }, { compProUntil: { lte: nowDate } }],
      },
    }),
  ]);
  const freeCount = total - compCount - proCount;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: total },
          { label: "Free", value: freeCount },
          { label: "Pro", value: proCount },
          { label: "Comp", value: compCount },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-4">
            <p className="text-xs uppercase tracking-wide text-almi-text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-almi-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-3 text-xs text-almi-text-muted">Showing the 20 most recent sign-ups.</p>
        <div className="overflow-x-auto rounded-2xl border border-almi-bg-peach">
          <table className="w-full text-left text-sm">
            <thead className="bg-almi-bg text-xs uppercase tracking-wide text-almi-text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-almi-bg-peach bg-almi-paper">
              {users.map((u) => {
                const plan = classifyPlan(u);
                const badge = PLAN_BADGE[plan];
                const la = lastActive(u.sessions[0]?.expiresAt, u.updatedAt);
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-almi-ink">{u.email}</td>
                    <td className="px-4 py-3 text-almi-text-muted">{u.createdAt.toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-almi-text-muted">{la.toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
