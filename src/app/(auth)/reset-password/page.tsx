import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";

  if (!token) {
    return (
      <div className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-almi-ink">Invalid reset link</h1>
        <p className="mt-2 text-sm text-almi-text-muted">
          This page expects a token in the URL. Request a new reset link from{" "}
          <Link href="/forgot-password" className="text-almi-coral hover:underline">
            forgot password
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-almi-ink">Set a new password</h1>
      <ResetPasswordForm token={token} />
    </div>
  );
}
