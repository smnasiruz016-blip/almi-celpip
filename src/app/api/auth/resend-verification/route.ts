import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendEmailVerification } from "@/lib/email";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://almicelpip.almiworld.com";
}

export async function POST(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  if (user.emailVerified) {
    return Response.json({ ok: true, alreadyVerified: true });
  }

  // Cooldown — prevent abuse via repeated resend clicks.
  if (
    user.emailVerificationLastSentAt &&
    user.emailVerificationLastSentAt.getTime() > Date.now() - RESEND_COOLDOWN_MS
  ) {
    return Response.json(
      { ok: false, error: "Please wait a moment before requesting another email." },
      { status: 429 },
    );
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,
      emailVerificationLastSentAt: new Date(),
    },
  });

  try {
    await sendEmailVerification({
      to: user.email,
      verifyUrl: `${getBaseUrl()}/api/auth/verify-email?token=${rawToken}`,
    });
  } catch (e) {
    console.error("[resend-verification] email send failed:", e);
    return Response.json(
      { ok: false, error: "Email send failed. Try again in a moment." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
