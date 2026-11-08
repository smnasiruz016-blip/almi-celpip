/**
 * RR-397 · THE FREE 48 HOURS (no card), the AlmiOET method (almi-oet:src/lib/billing/taste.ts), owner decision 8 Nov 2026.
 *
 * WHO: an account that has NEVER had a subscription of any kind (no status, no Stripe subscription id) and no comp grant, for
 * TASTE_HOURS after it was created. A cancelled subscriber, an ex-trialist or an ex-comp account gets no new free time. No column
 * was added: createdAt is the start, so there is no migration and nothing to backfill. One free 48 hours per account (the same
 * simple guard as AlmiOET; nothing here blocks a real person).
 *
 * WHAT: during the 48 hours the practice that does not use AI is open. AI scoring is limited to TASTE_AI_LIMITS per account
 * (1 Writing + 1 Speaking, as AlmiOET), and to this product's share of the network's $1/day free-AI budget (./free-ai-budget.ts).
 *
 * WHAT IT DOES NOT TOUCH: hasPaidAccess() is unchanged and is asked FIRST. The free 48 hours are a separate, narrower door that is
 * only asked when hasPaidAccess() has already said no — so a running card trial and a paying learner never reach this code.
 */
import { TASTE_HOURS } from "./offer";

const HOUR_MS = 60 * 60 * 1000;

export type TasteUser = {
  createdAt?: Date | null;
  subscriptionStatus?: string | null;
  stripeSubscriptionId?: string | null;
  compProUntil?: Date | null;
};

/** When this account's free 48 hours end, or null if it never had them (ever subscribed, ever comped). */
export function tasteEndsAt(user: TasteUser): Date | null {
  if (!(user.createdAt instanceof Date)) return null;
  if (user.subscriptionStatus != null) return null;
  if (user.stripeSubscriptionId) return null;
  if (user.compProUntil != null) return null;
  return new Date(user.createdAt.getTime() + TASTE_HOURS * HOUR_MS);
}

export function isTasteActive(user: TasteUser, now: number = Date.now()): boolean {
  const end = tasteEndsAt(user);
  return end !== null && end.getTime() > now;
}

/** True when the account HAD free 48 hours and they are over: the "Your free 48 hours are over" screen. */
export function isTasteOver(user: TasteUser, now: number = Date.now()): boolean {
  const end = tasteEndsAt(user);
  return end !== null && end.getTime() <= now;
}

export function tasteHoursLeft(user: TasteUser, now: number = Date.now()): number | null {
  const end = tasteEndsAt(user);
  if (!end || end.getTime() <= now) return null;
  return Math.ceil((end.getTime() - now) / HOUR_MS);
}

/** AI scorings a free account may receive in its 48 hours, per kind (AlmiOET: 1 Writing letter + 1 Speaking role-play). */
export const TASTE_AI_LIMITS = { WRITING: 1, SPEAKING: 1 } as const;
export type TasteAiKind = keyof typeof TASTE_AI_LIMITS;

export type TasteAiVerdict = { ok: true } | { ok: false; reason: "NO_TASTE" | "OVER" | "USED" | "BUDGET" };

/** Pure: may a NOT-PAID learner have ONE AI scoring of this kind now? (Paid access is decided before this is asked.)
 *  usedOfKind = AI scorings of this kind the account already RECEIVED; budgetOk = this product's free-AI budget for today. */
export function tasteMayUseAi(input: { user: TasteUser; kind: TasteAiKind; usedOfKind: number; budgetOk: boolean; now?: number }): TasteAiVerdict {
  const end = tasteEndsAt(input.user);
  if (end === null) return { ok: false, reason: "NO_TASTE" };
  if (end.getTime() <= (input.now ?? Date.now())) return { ok: false, reason: "OVER" };
  if (input.usedOfKind >= TASTE_AI_LIMITS[input.kind]) return { ok: false, reason: "USED" };
  if (!input.budgetOk) return { ok: false, reason: "BUDGET" };
  return { ok: true };
}
