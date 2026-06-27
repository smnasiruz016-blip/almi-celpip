import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const TOKEN_HEX_RE = /^[a-f0-9]{64}$/;
const PASSWORD_MIN = 8;

class InvalidTokenError extends Error {}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const input = body as { token?: unknown; password?: unknown };
  const token = typeof input.token === "string" ? input.token : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!TOKEN_HEX_RE.test(token) || password.length < PASSWORD_MIN) {
    return Response.json(
      { ok: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const passwordHash = await hashPassword(password);

  try {
    await prisma.$transaction(async (tx) => {
      const row = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
      });
      if (!row || row.usedAt !== null || row.expiresAt < new Date()) {
        throw new InvalidTokenError();
      }
      await tx.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      });
      await tx.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });
      await tx.session.deleteMany({ where: { userId: row.userId } });
    });
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      return Response.json(
        { ok: false, error: "Invalid or expired token" },
        { status: 400 },
      );
    }
    throw err;
  }

  return Response.json({ ok: true });
}
