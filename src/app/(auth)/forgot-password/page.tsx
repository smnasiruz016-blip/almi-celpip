"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Generic success regardless — endpoint is generic-200 by design.
    }
    setStatus("done");
  }

  return (
    <div className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-almi-ink">Reset your password</h1>
      <p className="mt-2 text-sm text-almi-text-muted">
        Enter the email you signed up with. We&apos;ll send a reset link.
      </p>

      {status === "done" ? (
        <div className="mt-6 rounded-xl border border-almi-teal/30 bg-almi-teal/10 px-4 py-4 text-sm text-almi-ink">
          If an account exists for that email, a reset link is on its way. Check your inbox.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
          <button
            type="submit"
            disabled={status === "sending"}
            className="inline-flex w-full min-h-[44px] items-center justify-center rounded-pill bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink transition-colors hover:bg-almi-coral-deep disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-almi-coral/30"
            style={{ borderRadius: 9999 }}
          >
            {status === "sending" ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-almi-text-muted">
        <Link href="/login" className="font-medium text-almi-coral hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
