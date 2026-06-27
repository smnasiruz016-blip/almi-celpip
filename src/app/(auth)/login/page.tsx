import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, getCurrentUser, verifyPassword } from "@/lib/auth";

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/login?error=invalid");

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) redirect("/login?error=invalid");

  await createSession(user.id);
  redirect("/account");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/account");
  const params = await searchParams;
  const error = params.error;

  return (
    <div className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-almi-ink">Welcome back</h1>
      <p className="mt-2 text-sm text-almi-text-muted">Log in to continue.</p>

      {error === "invalid" && (
        <p className="mt-4 rounded-xl border border-almi-coral/30 bg-almi-coral/10 px-4 py-3 text-sm text-almi-coral-deep">
          Email or password is incorrect.
        </p>
      )}
      {error === "missing" && (
        <p className="mt-4 rounded-xl border border-almi-coral/30 bg-almi-coral/10 px-4 py-3 text-sm text-almi-coral-deep">
          Please enter both email and password.
        </p>
      )}

      <form action={loginAction} className="mt-6 space-y-4">
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
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-almi-ink/15 bg-almi-bg px-4 py-3 text-sm text-almi-ink focus:border-almi-coral focus:outline-none focus:ring-2 focus:ring-almi-coral/20"
          />
        </div>
        <button
          type="submit"
          className="inline-flex w-full min-h-[44px] items-center justify-center rounded-pill bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink transition-colors hover:bg-almi-coral-deep focus:outline-none focus:ring-4 focus:ring-almi-coral/30"
          style={{ borderRadius: 9999 }}
        >
          Log in
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm text-almi-text-muted">
        <Link href="/forgot-password" className="font-medium text-almi-coral hover:underline">
          Forgot password?
        </Link>
        <p>
          New here?{" "}
          <Link href="/signup" className="font-medium text-almi-coral hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
