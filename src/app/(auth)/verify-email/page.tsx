import Link from "next/link";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "pending";

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-almi-teal/30 bg-almi-paper p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold text-almi-ink">Email verified</h1>
        <p className="mt-2 text-sm text-almi-text-muted">
          Thanks for confirming. Your account is fully set up.
        </p>
        <Link
          href="/account"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep"
          style={{ borderRadius: 9999 }}
        >
          Go to my account
        </Link>
      </div>
    );
  }

  if (status === "expired" || status === "invalid") {
    return (
      <div className="rounded-2xl border border-almi-coral/30 bg-almi-paper p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold text-almi-ink">
          {status === "expired" ? "Link expired" : "Invalid link"}
        </h1>
        <p className="mt-2 text-sm text-almi-text-muted">
          The verification link is no longer valid. Log in and request a fresh one
          from the banner on your account page.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep"
          style={{ borderRadius: 9999 }}
        >
          Log in
        </Link>
      </div>
    );
  }

  // status === "pending" — landing after signup before they click the email.
  return (
    <div className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-8 shadow-sm text-center">
      <h1 className="text-2xl font-semibold text-almi-ink">Check your inbox</h1>
      <p className="mt-2 text-sm text-almi-text-muted">
        We sent a verification link to your email. Click it to confirm your account.
      </p>
      <p className="mt-4 text-xs text-almi-text-muted">
        Didn&apos;t arrive? Check spam, or request a fresh link from your account page after logging in.
      </p>
    </div>
  );
}
