// Admin AI usage dashboard. Read-only aggregation of AICostLedger: lifetime +
// month-to-date spend, by-feature breakdown, and the most recent calls. Re-gates
// on isAdmin.

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/founder";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/ai/cost";

export const dynamic = "force-dynamic";

export default async function AdminCostsPage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) redirect("/");

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [lifetime, mtd, byFeature, recent] = await Promise.all([
    prisma.aICostLedger.aggregate({ _sum: { costCents: true }, _count: true }),
    prisma.aICostLedger.aggregate({
      _sum: { costCents: true },
      _count: true,
      where: { timestamp: { gte: startOfMonth } },
    }),
    prisma.aICostLedger.groupBy({
      by: ["feature"],
      _sum: { costCents: true },
      _count: true,
      orderBy: { _sum: { costCents: "desc" } },
    }),
    prisma.aICostLedger.findMany({
      orderBy: { timestamp: "desc" },
      take: 20,
      select: {
        id: true,
        timestamp: true,
        feature: true,
        model: true,
        costCents: true,
        success: true,
      },
    }),
  ]);

  const Stat = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
    <div className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-almi-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-almi-ink">{value}</p>
      <p className="text-xs text-almi-text-muted">{sub}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Lifetime spend"
          value={formatCents(lifetime._sum.costCents ?? 0)}
          sub={`${lifetime._count} AI calls`}
        />
        <Stat
          label="Month to date"
          value={formatCents(mtd._sum.costCents ?? 0)}
          sub={`${mtd._count} AI calls since the 1st`}
        />
      </div>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-almi-text-muted">By feature</h2>
        <div className="mt-3 space-y-2">
          {byFeature.length === 0 && <p className="text-sm text-almi-text-muted">No AI usage yet.</p>}
          {byFeature.map((f) => (
            <div
              key={f.feature}
              className="flex items-center justify-between rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-2"
            >
              <span className="text-sm text-almi-text">{f.feature}</span>
              <span className="text-sm text-almi-text-muted">
                {formatCents(f._sum.costCents ?? 0)} · {f._count} calls
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-almi-text-muted">Recent calls</h2>
        <div className="mt-3 space-y-1.5">
          {recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-1 text-xs text-almi-text-muted">
              <span className="truncate">
                {new Date(r.timestamp).toLocaleString()} · {r.feature} · {r.model}
                {r.success ? "" : " · failed"}
              </span>
              <span className="shrink-0 text-almi-text">{formatCents(r.costCents)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
