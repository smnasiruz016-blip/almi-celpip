import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db-retry";
import { getIpHash } from "@/lib/ip-hash";
import { sendPasswordResetEmail } from "@/lib/email";

const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 5;
const TOKEN_TTL_MS = 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buckets = new Map<string, number[]>();

function rateLimitOk(key: string, max: number): boolean {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const prev = buckets.get(key) ?? [];
  const recent = prev.filter((t) => t > cutoff);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://almicelpip.almiworld.com";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Generic-200 contract: any unhandled error past this point still returns
  // { ok: true } so the response shape never leaks user existence.
  try {
    const input = body as { email?: unknown };
    const emailRaw = typeof input.email === "string" ? input.email : "";
    const email = emailRaw.trim().toLowerCase();

    if (email && email.length <= 254 && EMAIL_RE.test(email)) {
      const ip = getClientIp(req);
      const ipHash = ip === "unknown" ? null : getIpHash(ip);
      const emailKey = `email:${email}`;
      const ipKey = ipHash ? `ip:${ipHash}` : null;

      const emailOk = rateLimitOk(emailKey, MAX_PER_EMAIL);
      const ipOk = ipKey ? rateLimitOk(ipKey, MAX_PER_IP) : true;

      if (emailOk && ipOk) {
        await withDbRetry(async () => {
          const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
          });
          if (!user) return;

          const rawToken = randomBytes(32).toString("hex");
          const tokenHash = createHash("sha256").update(rawToken).digest("hex");
          const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

          await prisma.passwordResetToken.create({
            data: { userId: user.id, tokenHash, expiresAt },
          });

          const resetUrl = `${getBaseUrl()}/reset-password?token=${rawToken}`;

          try {
            await sendPasswordResetEmail({ to: email, resetUrl });
          } catch (e) {
            console.error("[forgot-password] email send failed:", e);
          }
        });
      }
    }
  } catch (err) {
    console.error("[forgot-password] handler error:", err);
  }

  return Response.json({ ok: true });
}
