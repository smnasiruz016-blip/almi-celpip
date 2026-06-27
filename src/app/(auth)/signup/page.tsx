import Link from "next/link";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { createSession, getCurrentUser, hashPassword } from "@/lib/auth";
import { sendEmailVerification } from "@/lib/email";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://almicelpip.almiworld.com";
}

async function signupAction(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 8) {
    redirect("/signup?error=invalid");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/signup?error=taken");

  const passwordHash = await hashPassword(password);
  const verifyRaw = randomBytes(32).toString("hex");
  const verifyHash = createHash("sha256").update(verifyRaw).digest("hex");
  const verifyExpires = new Date(Date.now() + VERIFY_TTL_MS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      emailVerificationTokenHash: verifyHash,
      emailVerificationExpiresAt: verifyExpires,
      emailVerificationLastSentAt: new Date(),
    },
  });

  // Best-effort email send — don't block signup if Resend is down or
  // unconfigured. User can request resend from the banner.
  try {
    await sendEmailVerification({
      to: email,
      verifyUrl: `${getBaseUrl()}/api/auth/verify-email?token=${verifyRaw}`,
    });
  } catch (e) {
    console.error("[signup] verification email failed:", e);
  }

  await createSession(user.id);
  redirect("/account?welcome=true");
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/account");
  const params = await searchParams;
  const error = params.error;

  return (
    <div className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-almi-ink">Create your account</h1>
      <p className="mt-2 text-sm text-almi-text-muted">
        Practise the Canadian English Language Proficiency Index Program with honest AI feedback on the 10–160 scale.
      </p>

      {error === "taken" && (
        <p className="mt-4 rounded-xl border border-almi-coral/30 bg-almi-coral/10 px-4 py-3 text-sm text-almi-coral-deep">
          An account with that email already exists.
        </p>
      )}
      {error === "invalid" && (
        <p className="mt-4 rounded-xl border border-almi-coral/30 bg-almi-coral/10 px-4 py-3 text-sm text-almi-coral-deep">
          Please fill in all fields. Password must be at least 8 characters.
        </p>
      )}

      <form action={signupAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-almi-ink">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            autoComplete="name"
            className="mt-2 w-full rounded-xl border border-almi-ink/15 bg-almi-bg px-4 py-3 text-sm text-almi-ink focus:border-almi-coral focus:outline-none focus:ring-2 focus:ring-almi-coral/20"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-almi-ink">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-almi-ink/15 bg-almi-bg px-4 py-3 text-sm text-almi-ink focus:border-almi-coral focus:outline-none focus:ring-2 focus:ring-almi-coral/20"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-almi-ink">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            autoComplete="new-password"
            minLength={8}
            className="mt-2 w-full rounded-xl border border-almi-ink/15 bg-almi-bg px-4 py-3 text-sm text-almi-ink focus:border-almi-coral focus:outline-none focus:ring-2 focus:ring-almi-coral/20"
          />
          <p className="mt-2 text-xs text-almi-text-muted">At least 8 characters.</p>
        </div>
        <button
          type="submit"
          className="inline-flex w-full min-h-[44px] items-center justify-center rounded-pill bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink transition-colors hover:bg-almi-coral-deep focus:outline-none focus:ring-4 focus:ring-almi-coral/30"
          style={{ borderRadius: 9999 }}
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-almi-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-almi-coral hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
