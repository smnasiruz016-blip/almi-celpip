import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

const TOKEN_HEX_RE = /^[a-f0-9]{64}$/;

function getBaseUrl(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  );
}

// GET /api/auth/verify-email?token=... — the link target from the email.
// Always redirects to /verify-email with a status query param so the user
// sees a branded page rather than raw JSON.
export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const base = getBaseUrl(req);

  if (!TOKEN_HEX_RE.test(token)) {
    return NextResponse.redirect(`${base}/verify-email?status=invalid`);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findUnique({
    where: { emailVerificationTokenHash: tokenHash },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerificationExpiresAt: true,
      emailVerified: true,
    },
  });

  if (!user) {
    return NextResponse.redirect(`${base}/verify-email?status=invalid`);
  }

  // Already verified — treat the click as a no-op success.
  if (user.emailVerified) {
    return NextResponse.redirect(`${base}/verify-email?status=success`);
  }

  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
    return NextResponse.redirect(`${base}/verify-email?status=expired`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    },
  });

  // Welcome email — sent once, only on the fresh-verification path (the
  // already-verified branch above returns early, so this never double-sends).
  // Fire-and-forget: a mail failure must not break the user's verification.
  try {
    await sendWelcomeEmail({ to: user.email, name: user.name });
  } catch (err) {
    console.error("[verify-email] welcome send failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.redirect(`${base}/verify-email?status=success`);
}
