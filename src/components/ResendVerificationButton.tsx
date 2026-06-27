"use client";

// Resend the email-verification link from the Account → Email card. Hits the
// same endpoint as the top banner (EmailVerifyBanner); the 60-second cooldown is
// enforced server-side (/api/auth/resend-verification → 429), so this button
// just surfaces whatever the endpoint returns.

import { useState } from "react";

export function ResendVerificationButton({ email }: { email: string }) {
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
        setMsg(data.alreadyVerified ? "Your email is already verified." : `Verification link sent to ${email}.`);
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
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={resend}
        disabled={status === "sending" || status === "sent"}
        className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-almi-coral px-5 py-2 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : status === "sent" ? "Sent ✓" : "Resend verification email"}
      </button>
      {msg && (
        <span
          className={
            "text-sm " +
            (status === "sent"
              ? "text-almi-teal"
              : status === "error" || status === "cooldown"
                ? "text-almi-coral-deep"
                : "text-almi-text-muted")
          }
        >
          {msg}
        </span>
      )}
    </div>
  );
}
