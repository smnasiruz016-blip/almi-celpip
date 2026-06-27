"use client";

import { useState } from "react";

export function EmailVerifyBanner({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "cooldown" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  async function resend() {
    setStatus("sending");
    setMsg("");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setStatus("sent");
        setMsg(`Verification link sent to ${email}.`);
      } else if (res.status === 429) {
        setStatus("cooldown");
        setMsg(data.error ?? "Please wait a moment before requesting another email.");
      } else {
        setStatus("error");
        setMsg(data.error ?? "Could not send verification email.");
      }
    } catch {
      setStatus("error");
      setMsg("Network error. Try again in a moment.");
    }
  }

  return (
    <div className="border-b border-almi-coral/30 bg-almi-coral/10 px-6 py-3">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-almi-ink">
          <span className="font-semibold">Please verify your email.</span>{" "}
          <span className="text-almi-text">
            Paid features are gated until you click the link we sent to {email}.
          </span>
        </p>
        <div className="flex items-center gap-3">
          {msg && (
            <span
              className={
                status === "sent"
                  ? "text-almi-teal"
                  : status === "error" || status === "cooldown"
                    ? "text-almi-coral-deep"
                    : "text-almi-text-muted"
              }
            >
              {msg}
            </span>
          )}
          <button
            type="button"
            onClick={resend}
            disabled={status === "sending" || status === "sent"}
            className="rounded-md border border-almi-ink/15 bg-almi-paper px-3 py-1.5 text-xs font-semibold text-almi-ink hover:border-almi-coral disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : status === "sent" ? "Sent" : "Resend email"}
          </button>
        </div>
      </div>
    </div>
  );
}
