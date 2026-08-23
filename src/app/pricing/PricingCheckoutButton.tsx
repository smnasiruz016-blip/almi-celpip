"use client";

import { useState } from "react";

export function PricingCheckoutButton({
  plan,
  disabled,
}: {
  plan: "monthly" | "yearly";
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setErr(data.error ?? "Unable to start checkout.");
      setLoading(false);
    } catch {
      setErr("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        className="inline-flex w-full min-h-[44px] items-center justify-center bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep disabled:opacity-60"
        style={{ borderRadius: 9999 }}
      >
        {loading ? "Starting…" : disabled ? "Checkout unavailable" : "Start 7-day free trial"}
      </button>
      {err && <p className="mt-2 text-xs text-almi-coral-deep">{err}</p>}
    </div>
  );
}
