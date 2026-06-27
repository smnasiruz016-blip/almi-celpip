import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  isBillingEnabled,
  STRIPE_PRICE_MONTHLY,
  STRIPE_PRICE_YEARLY,
  priceIdToPlanLabel,
} from "@/lib/billing/plans";
import { createCheckoutSession } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  if (!isBillingEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Billing is not enabled yet" },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { ok: false, error: "Please verify your email before subscribing." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const input = body as { plan?: unknown };
  const plan = typeof input.plan === "string" ? input.plan : "";

  let priceId = "";
  if (plan === "monthly") priceId = STRIPE_PRICE_MONTHLY;
  else if (plan === "yearly") priceId = STRIPE_PRICE_YEARLY;

  // Server-side allowlist defense — never trust browser-supplied price IDs.
  if (!priceIdToPlanLabel(priceId)) {
    return NextResponse.json({ ok: false, error: "Invalid plan" }, { status: 400 });
  }

  try {
    const { url } = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      priceId,
    });
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("[checkout] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Unable to start checkout. Try again in a moment." },
      { status: 500 },
    );
  }
}
