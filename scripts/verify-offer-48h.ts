// RR-394 · behaviour proof for the 48-hour offer. Run: npx tsx scripts/verify-offer-48h.ts
//   1. a NEW checkout gets a 48-hour trial (trial_period_days: 2), and the checkout really uses it;
//   2. a 7-day trial that is ALREADY running keeps its access to its own end (it is not cut at 48 hours);
//   3. a paying subscriber keeps access exactly as before.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const pick = (c: string[]) => c.find((p) => existsSync(join(ROOT, p)));
const OFFER = pick(["src/lib/billing/offer.ts", "src/lib/offer.ts"])!;
const STRIPE = pick(["src/lib/billing/stripe.ts", "src/lib/stripe.ts"])!;
const ACCESS = pick(["src/lib/billing/plans.ts", "src/lib/plans.ts", "src/lib/billing/access.ts", "src/lib/access.ts", "src/lib/entitlement.ts", "src/lib/billing/entitlement.ts"]);

let failed = 0;
const t = async (name: string, fn: () => unknown | Promise<unknown>) => {
  try { await fn(); console.log(`  PASS ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message.split("\n")[0]}`); }
};
const DAY = 86_400_000;

(async () => {
  const offer = await import(pathToFileURL(join(ROOT, OFFER)).href);
  await t("a new checkout has a 48-hour trial (trial_period_days: 2)", () => {
    assert.equal(offer.TRIAL_PERIOD_DAYS, 2);
    assert.equal(offer.TRIAL_HOURS, 48);
    assert.deepEqual(offer.trialForNewCheckout(), { trial_period_days: 2 });
  });
  await t("the checkout session is built from the offer file, not a number of its own", () => {
    const s = readFileSync(join(ROOT, STRIPE), "utf8");
    assert.match(s, /from "\.\/offer"/);
    assert.match(s, /trial_period_days:\s*TRIAL_PERIOD_DAYS|\.\.\.trialForNewCheckout\(\)/);
    assert.doesNotMatch(s, /const TRIAL_(PERIOD_)?DAYS\s*=/);
  });

  if (!ACCESS) { failed++; console.log("  FAIL no access module found: point ACCESS at this repo's isProActive / hasPaidAccess"); }
  else {
    const access = await import(pathToFileURL(join(ROOT, ACCESS)).href);
    const fn = access.isProActive ?? access.hasActiveSubscription ?? access.isSubscriptionActive;
    if (typeof fn !== "function") { failed++; console.log(`  FAIL ${ACCESS} exports no isProActive: adapt this test to the repo's own access predicate`); }
    else {
      const now = Date.now();
      const base = { compProUntil: null, emailVerified: new Date(now - 30 * DAY), email: "learner@example.com" };
      await t("an existing 7-day trial is unchanged: started 3 days ago (past 48 h), Stripe's end 4 days ahead → still has access", () => {
        assert.equal(fn({ ...base, subscriptionStatus: "trialing", subscriptionCurrentPeriodEnd: new Date(now + 4 * DAY), trialEndsAt: new Date(now + 4 * DAY), createdAt: new Date(now - 3 * DAY) }), true);
      });
      await t("an existing paying subscriber is unchanged → access", () => {
        assert.equal(fn({ ...base, subscriptionStatus: "active", subscriptionCurrentPeriodEnd: new Date(now + 20 * DAY), trialEndsAt: null, createdAt: new Date(now - 90 * DAY) }), true);
      });
      await t("control: a subscription whose period has ended → no access (the predicate really looks at the dates)", () => {
        assert.equal(fn({ ...base, subscriptionStatus: "active", subscriptionCurrentPeriodEnd: new Date(now - DAY), trialEndsAt: null, createdAt: new Date(now - 90 * DAY) }), false);
      });
    }
  }
  console.log(failed ? `\nOFFER TEST FAIL (${failed})` : "\nOFFER TEST PASS");
  process.exitCode = failed ? 1 : 0;
})();
