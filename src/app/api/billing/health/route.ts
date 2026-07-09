import { NextResponse } from "next/server";
import Stripe from "stripe";

// Read-only billing self-check. Exposes NO secret values — only key MODE
// (live/test), boolean validity, and public price IDs/amounts. Safe to call.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function keyMode(k: string): string {
  if (!k) return "missing";
  if (k.startsWith("sk_live_")) return "live";
  if (k.startsWith("sk_test_")) return "test";
  return "unknown";
}

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const mode = keyMode(key);
  const priceVars = ["STRIPE_PRICE_ID_MONTHLY", "STRIPE_PRICE_ID_YEARLY", "STRIPE_PRICE_ID"] as const;
  const present: Record<string, string> = {};
  for (const v of priceVars) {
    const val = process.env[v];
    if (val) present[v] = val;
  }

  const out: Record<string, unknown> = {
    keyPresent: Boolean(key),
    keyMode: mode,
    priceVarsPresent: Object.keys(present),
  };
  if (!key) {
    out.ok = false;
    out.reason = "STRIPE_SECRET_KEY missing";
    return NextResponse.json(out);
  }

  const stripe = new Stripe(key);

  let keyValid = false;
  try {
    await stripe.balance.retrieve();
    keyValid = true;
  } catch (e) {
    out.keyError = (e as { code?: string; type?: string }).code || (e as { type?: string }).type || "auth_failed";
  }
  out.keyValid = keyValid;

  let portalReachable = false;
  try {
    const cfgs = await stripe.billingPortal.configurations.list({ limit: 1 });
    portalReachable = cfgs.data.some((c) => c.active);
  } catch {
    portalReachable = false;
  }
  out.portalReachable = portalReachable;

  const prices: Record<string, unknown> = {};
  for (const [v, id] of Object.entries(present)) {
    try {
      const p = await stripe.prices.retrieve(id);
      prices[v] = {
        priceId: id,
        valid: true,
        active: p.active,
        recurring: p.recurring?.interval ?? "one-time",
        amount: p.unit_amount,
        modeMatch: (mode === "live") === p.livemode,
      };
    } catch (e) {
      prices[v] = { priceId: id, valid: false, error: (e as { code?: string }).code || "retrieve_failed" };
    }
  }
  out.prices = prices;

  const anyPrice = Object.keys(present).length > 0;
  const pricesOk = anyPrice && Object.values(prices).every(
    (p) => (p as { valid?: boolean }).valid && (p as { modeMatch?: boolean }).modeMatch,
  );
  out.ok = keyValid && portalReachable && pricesOk;
  return NextResponse.json(out);
}
