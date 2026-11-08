/**
 * RR-397 · THE FREE-AI BUDGET: the owner allows at most $1 a day of AI for free (no-card) accounts across ALL AlmiWorld products.
 *
 * There is no store shared by the products (each has its own database), so the $1 is split equally between the 19 products that give
 * free AI (18 + AlmiOET): $1 / 19 = $0.0526 each. This product starts a free AI scoring only while what free accounts spent TODAY (UTC)
 * is under FREE_AI_DAILY_BUDGET_UNITS = $0.035. The last call may run past it by ONE call (a scoring costs about 1–2 cents), so a
 * product's worst day is about $0.05 and the network's about $0.95 — under $1.
 *
 * Spend is read from this product's own AICostLedger (costCents is in 1/100 of a cent): rows written today for accounts that never
 * subscribed (the free-48-hours accounts). Paying subscribers and running card trials are never counted and never limited here.
 */
import { prisma } from "@/lib/prisma";
import { tasteEndsAt } from "./taste";

/** in AICostLedger units (1/100 cent): 350 = $0.035 per UTC day for this product */
export const FREE_AI_DAILY_BUDGET_UNITS = 350;
export const FREE_AI_BUSY_MESSAGE = "Free AI scoring is busy today. Try again tomorrow, or unlock everything now for $12/month.";

export function startOfUtcDay(now: number = Date.now()): Date {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Pure: is there budget left, given today's free spend? */
export function freeAiBudgetLeft(spentUnitsToday: number): boolean {
  return spentUnitsToday < FREE_AI_DAILY_BUDGET_UNITS;
}

/** Pure: sum today's ledger rows that belong to free (never-subscribed) accounts. */
export function sumFreeSpend(
  rows: { userId: string | null; costCents: number }[],
  users: { id: string; createdAt?: Date | null; subscriptionStatus?: string | null; stripeSubscriptionId?: string | null; compProUntil?: Date | null }[],
): number {
  const free = new Set(users.filter((u) => tasteEndsAt(u) !== null).map((u) => u.id));
  return rows.reduce((s, r) => s + (r.userId && free.has(r.userId) ? r.costCents : 0), 0);
}

/** What free accounts spent on AI today (UTC), in ledger units. Read-only. */
export async function freeAiSpentToday(now: number = Date.now()): Promise<number> {
  const rows = await prisma.aICostLedger.findMany({ where: { timestamp: { gte: startOfUtcDay(now) }, userId: { not: null } }, select: { userId: true, costCents: true } });
  if (rows.length === 0) return 0;
  const ids = [...new Set(rows.map((r) => r.userId as string))];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, createdAt: true, subscriptionStatus: true, stripeSubscriptionId: true, compProUntil: true } });
  return sumFreeSpend(rows, users);
}

export async function freeAiAllowedToday(now: number = Date.now()): Promise<boolean> {
  return freeAiBudgetLeft(await freeAiSpentToday(now));
}
