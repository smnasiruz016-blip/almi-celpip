/**
 * RR-394 · THE OFFER, in one place (owner decision 7 Nov 2026, the same offer as AlmiOET):
 *     "Try free for 48 hours, then $12/month. Cancel anytime."
 *
 * - New checkouts: Stripe is handed a 48-hour trial, trial_period_days: 2 (Stripe counts trials in whole days).
 * - Trials already running (the older, longer ones): untouched. Their end date lives on the Stripe subscription; the webhook copies
 *   subscription.trial_end / current_period_end from Stripe and NOTHING in this app recomputes it from this number.
 * - Paying subscribers: untouched. This value is read only when a NEW Checkout Session is created.
 *
 * scripts/gates/offer-48h.mjs holds this file, the checkout and every customer-facing line to it (and turns RED if any drifts).
 */
export const TRIAL_PERIOD_DAYS = 2;
export const TRIAL_HOURS = TRIAL_PERIOD_DAYS * 24;
export const OFFER_LINE = "Try free for 48 hours, then $12/month. Cancel anytime.";

/** what a NEW checkout gives Stripe; it never carries a trial_end, so it can never shorten a trial that is already running */
export function trialForNewCheckout(): { trial_period_days: number } {
  return { trial_period_days: TRIAL_PERIOD_DAYS };
}
