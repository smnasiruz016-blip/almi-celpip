// THE START PATH for the 3-day no-card window.
//
// One helper, called at every entry point, because the 2026-08-18 AlmiPrep deadlock
// was an ORDERING bug and ordering bugs come back the moment two call sites do it
// differently. The order here is the whole fix:
//
//   1. refuse ONLY an expired non-payer      (never-started falls through)
//   2. THEN set the clock, if it is not set  (starting is what sets it)
//
// Reversed, a new user is refused before the clock is set, so the clock is never set,
// so they are refused forever. That is exactly what happened to all 27 AlmiPrep users.
//
// The clock write is conditional on freeAccessStartedAt still being NULL, so a second
// tab, a retry, or a double-submit can never restart someone's three days.

import { prisma } from "@/lib/prisma";
import { isFreeWindowSubTest, isPracticeStartBlocked, hasPaidAccess } from "@/lib/billing/plans";
import { hasPracticeAccess } from "@/lib/billing/free-access";
import type { CelpipSubTest } from "@prisma/client";

type StartUser = Parameters<typeof isPracticeStartBlocked>[0] & { id: string; createdAt?: Date | null; stripeSubscriptionId?: string | null };

export type StartDecision = { allowed: true } | { allowed: false; reason: "PAYWALL" | "WINDOW_EXPIRED" };

/**
 * May this user begin this sub-test, and if so, start their window.
 *
 * LISTENING and READING are covered by the 3-day no-card window. Writing and Speaking are
 * not: each calls a paid model, so they open only for paid users and inside the free
 * 48 hours (RR-397), where the AI scoring is limited to one of each. The mock is paid only.
 */
export async function openPractice(user: StartUser, subTest: CelpipSubTest): Promise<StartDecision> {
  if (!isFreeWindowSubTest(subTest)) {
    // RR-397: Writing and Speaking open for paid users and inside the free 48 hours (no card); the AI scoring itself is
    // limited to one of each by aiGate() in the submit route.
    return hasPracticeAccess(user) ? { allowed: true } : { allowed: false, reason: "PAYWALL" };
  }
  if (isPracticeStartBlocked(user)) return { allowed: false, reason: "WINDOW_EXPIRED" };

  // Order matters: the refusal above has already passed, so this write is what turns a
  // never-started user into an in-window user. Conditional, so it only ever fires once.
  if (!user.freeAccessStartedAt && !hasPaidAccess(user)) {
    await prisma.user.updateMany({
      where: { id: user.id, freeAccessStartedAt: null },
      data: { freeAccessStartedAt: new Date() },
    });
  }
  return { allowed: true };
}

/**
 * The same decision, WITHOUT the clock write — for rendering only.
 *
 * Kept beside openPractice() on purpose: two predicates that disagree about who is
 * refused is how a page shows "start" on a button that then redirects to /pricing.
 */
export function wouldRefusePractice(user: StartUser, subTest: CelpipSubTest): boolean {
  if (!isFreeWindowSubTest(subTest)) return !hasPracticeAccess(user);
  return isPracticeStartBlocked(user);
}
