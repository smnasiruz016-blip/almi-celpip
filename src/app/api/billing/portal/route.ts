import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCustomerPortalSession } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  if (!user.stripeCustomerId) {
    return NextResponse.json(
      { ok: false, error: "No Stripe customer on file" },
      { status: 400 },
    );
  }

  try {
    const { url } = await createCustomerPortalSession(user.stripeCustomerId);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("[portal] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Unable to open billing portal." },
      { status: 500 },
    );
  }
}
