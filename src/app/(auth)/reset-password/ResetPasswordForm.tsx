"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      setErrMsg("Password must be at least 8 characters.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
        setTimeout(() => router.push("/login"), 1500);
      } else {
        setErrMsg(data.error ?? "Invalid or expired reset link.");
        setStatus("error");
      }
    } catch {
      setErrMsg("Network error. Try again.");
      setStatus("error");
    }
  }

  return (
    <>
      {status === "error" && errMsg && (
        <p className="mt-4 rounded-xl border border-almi-coral/30 bg-almi-coral/10 px-4 py-3 text-sm text-almi-coral-deep">
          {errMsg}
        </p>
      )}
      {status === "success" && (
        <p className="mt-4 rounded-xl border border-almi-teal/30 bg-almi-teal/10 px-4 py-3 text-sm text-almi-ink">
          Password updated. Redirecting to log in…
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-almi-ink">
            New password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            className="mt-2 w-full rounded-xl border border-almi-ink/15 bg-almi-bg px-4 py-3 text-sm text-almi-ink focus:border-almi-coral focus:outline-none focus:ring-2 focus:ring-almi-coral/20"
          />
          <p className="mt-2 text-xs text-almi-text-muted">At least 8 characters.</p>
        </div>
        <button
          type="submit"
          disabled={status === "sending" || status === "success"}
          className="inline-flex w-full min-h-[44px] items-center justify-center rounded-pill bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink transition-colors hover:bg-almi-coral-deep disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-almi-coral/30"
          style={{ borderRadius: 9999 }}
        >
          {status === "sending" ? "Updating…" : "Update password"}
        </button>
      </form>
    </>
  );
}
