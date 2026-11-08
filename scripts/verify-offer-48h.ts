// RR-397 · behaviour proof for "Try free for 48 hours, no card". Pure functions + source reads only: no database, no Stripe, no AI.
// Run: npx tsx scripts/verify-offer-48h.ts
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const DIR = existsSync(join(ROOT, "src/lib/billing/stripe.ts")) ? "src/lib/billing" : "src/lib";
const pick = (c: string[]) => c.find((p) => existsSync(join(ROOT, p)));
const ACCESS = pick(["src/lib/billing/plans.ts", "src/lib/plans.ts", "src/lib/access.ts", "src/lib/billing/access.ts", "src/lib/entitlement.ts"]);
const imp = (p: string) => import(pathToFileURL(join(ROOT, p)).href);

let failed = 0;
const t = async (name: string, fn: () => unknown | Promise<unknown>) => {
  try { await fn(); console.log(`  PASS ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message.split("\n")[0]}`); }
};
const HOUR = 3_600_000, DAY = 24 * HOUR;

(async () => {
  const offer = await imp(`${DIR}/offer.ts`);
  const taste = await imp(`${DIR}/taste.ts`);
  /* free-ai-budget imports prisma; only its pure parts are used, so a DATABASE_URL is never needed and never read */
  const budget = await imp(`${DIR}/free-ai-budget.ts`).catch(() => null);
  const now = Date.now();
  const fresh = { createdAt: new Date(now - HOUR), subscriptionStatus: null, stripeSubscriptionId: null, compProUntil: null };

  await t("a new sign-up gets 48 hours free with no card (no subscription needed)", () => {
    assert.equal(offer.TASTE_HOURS, 48);
    assert.equal(taste.isTasteActive(fresh, now), true);
    assert.equal(taste.tasteHoursLeft(fresh, now), 47);
    assert.equal(taste.tasteEndsAt(fresh)!.getTime(), fresh.createdAt.getTime() + 48 * HOUR);
  });
  await t("AI is used once and then blocked in the free time (1 Writing, 1 Speaking)", () => {
    for (const kind of ["WRITING", "SPEAKING"] as const) {
      assert.deepEqual(taste.tasteMayUseAi({ user: fresh, kind, usedOfKind: 0, budgetOk: true, now }), { ok: true });
      assert.deepEqual(taste.tasteMayUseAi({ user: fresh, kind, usedOfKind: 1, budgetOk: true, now }), { ok: false, reason: "USED" });
    }
  });
  await t("the daily free-AI cap stops free AI (this product's share: $0.035/day)", () => {
    assert.ok(budget, "free-ai-budget.ts could not be loaded");
    assert.equal(budget.FREE_AI_DAILY_BUDGET_UNITS, 350);
    assert.equal(budget.freeAiBudgetLeft(349), true);
    assert.equal(budget.freeAiBudgetLeft(350), false);
    assert.deepEqual(taste.tasteMayUseAi({ user: fresh, kind: "WRITING", usedOfKind: 0, budgetOk: false, now }), { ok: false, reason: "BUDGET" });
    const paid = { id: "p", createdAt: new Date(now - 90 * DAY), subscriptionStatus: "active", stripeSubscriptionId: "sub_1", compProUntil: null };
    const free = { id: "f", ...fresh };
    assert.equal(budget.sumFreeSpend([{ userId: "p", costCents: 900 }, { userId: "f", costCents: 120 }], [paid, free]), 120, "only free accounts' spend counts");
  });
  await t("after 48 hours the unlock screen appears (the account's free time is over)", () => {
    const old = { ...fresh, createdAt: new Date(now - 49 * HOUR) };
    assert.equal(taste.isTasteActive(old, now), false);
    assert.equal(taste.isTasteOver(old, now), true);
    assert.deepEqual(taste.tasteMayUseAi({ user: old, kind: "WRITING", usedOfKind: 0, budgetOk: true, now }), { ok: false, reason: "OVER" });
    assert.equal(offer.TASTE_OVER_TITLE, "Your free 48 hours are over");
    assert.equal(offer.UNLOCK_LABEL, "Unlock for $12/month");
  });
  await t("checkout has no trial", () => {
    assert.deepEqual(offer.trialForNewCheckout(), {});
    const s = readFileSync(join(ROOT, `${DIR}/stripe.ts`), "utf8").replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(s, /trial_period_days|trial_end|trial_from_plan/);
  });
  if (!ACCESS) { failed++; console.log("  FAIL no access module found: point ACCESS at this repo's own predicate"); }
  else {
    const access = await imp(ACCESS);
    const fn = access.isProActive ?? access.hasActiveSubscription;
    if (typeof fn !== "function") { failed++; console.log(`  FAIL ${ACCESS} exports no isProActive: adapt this test to the repo's own access predicate`); }
    else {
      const base = { compProUntil: null, emailVerified: new Date(now - 30 * DAY), email: "learner@example.com" };
      await t("an existing card trial is unchanged (7 days, started 3 days ago, Stripe's end 4 days ahead) and is not a free-48h account", () => {
        const u = { ...base, subscriptionStatus: "trialing", stripeSubscriptionId: "sub_t", subscriptionCurrentPeriodEnd: new Date(now + 4 * DAY), createdAt: new Date(now - 3 * DAY) };
        assert.equal(fn(u), true);
        assert.equal(taste.tasteEndsAt(u), null);
      });
      await t("a subscriber is unchanged (access, never a free-48h account, never budget-limited)", () => {
        const u = { ...base, subscriptionStatus: "active", stripeSubscriptionId: "sub_a", subscriptionCurrentPeriodEnd: new Date(now + 20 * DAY), createdAt: new Date(now - 90 * DAY) };
        assert.equal(fn(u), true);
        assert.equal(taste.tasteEndsAt(u), null);
      });
      await t("control: a subscription whose period has ended has no paid access", () => {
        assert.equal(fn({ ...base, subscriptionStatus: "active", stripeSubscriptionId: "sub_x", subscriptionCurrentPeriodEnd: new Date(now - DAY), createdAt: new Date(now - 90 * DAY) }), false);
      });
    }
  }
  console.log(failed ? `\nOFFER TEST FAIL (${failed})` : "\nOFFER TEST PASS");
  process.exitCode = failed ? 1 : 0;
})();
