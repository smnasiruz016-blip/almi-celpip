/**
 * RR-397 · THE OFFER, in one place (owner decision 8 Nov 2026, 04:47: every exam and language product works like AlmiOET):
 *     "Try free for 48 hours, no card. Then $12/month. Cancel anytime."
 *
 * - New accounts: 48 hours of free access from sign-up (User.createdAt), with NO card and NO Stripe trial (./taste.ts decides it).
 * - New checkouts: Stripe is handed nothing about a trial; it charges $12 at checkout, then monthly (trialForNewCheckout()).
 * - Card trials already running (the older ones, and the short RR-394 ones): untouched. Their dates live on the Stripe
 *   subscription; the webhook copies them and hasPaidAccess() still admits "trialing" to its end. Paying subscribers: untouched.
 *
 * scripts/gates/offer-48h.mjs holds this file, the checkout and every customer-facing line to it (RED if any drifts).
 */
export const TASTE_HOURS = 48;
export const OFFER_LINE = "Try free for 48 hours, no card. Then $12/month. Cancel anytime.";
export const UNLOCK_LABEL = "Unlock for $12/month";
export const TASTE_OVER_TITLE = "Your free 48 hours are over";

/** what a NEW checkout gives Stripe about a trial: nothing. No trial_period_days, no trial_end — so no new card trial is ever
 *  created, and no running trial can ever be shortened from here. */
export function trialForNewCheckout(): Record<string, never> {
  return {};
}
