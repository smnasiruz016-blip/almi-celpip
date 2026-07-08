import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCustomerPortalSession } from "@/lib/billing/stripe";

export const runtime = "nodejs";

// Invoked by a native <form method="POST"> on /account, so every response must be
// a redirect the browser can follow — returning JSON renders as naked text.
export async function POST(req: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  if (!user.stripeCustomerId) {
    return NextResponse.redirect(new URL("/pricing", req.url), 303);
  }

  try {
    const { url } = await createCustomerPortalSession(user.stripeCustomerId);
    return NextResponse.redirect(url, 303);
  } catch (err) {
    console.error("[portal] failed:", err);
    return NextResponse.redirect(new URL("/account?portal_error=1", req.url), 303);
  }
}
