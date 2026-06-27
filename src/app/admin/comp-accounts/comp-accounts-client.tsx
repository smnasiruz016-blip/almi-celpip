"use client";

// Comp Accounts UI: grant a comp Pro (email + days + reason), and manage active
// + expired grants (+30 days, revoke). All mutations go through the gated server
// actions; we refresh after each.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  grantCompPro,
  revokeCompPro,
  extendCompPro,
  type CompRow,
} from "@/lib/admin/comp-accounts";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

export function CompAccountsClient({
  active,
  expired,
}: {
  active: CompRow[];
  expired: CompRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("90");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function grant() {
    setMsg(null);
    startTransition(async () => {
      const res = await grantCompPro({
        email,
        days: Number(days),
        reason: reason || undefined,
      });
      if (res.ok) {
        setMsg({ ok: true, text: `Comp Pro granted to ${email.trim().toLowerCase()}.` });
        setEmail("");
        setReason("");
        setDays("90");
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Could not grant." });
      }
    });
  }

  function extend(userId: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await extendCompPro({ userId, additionalDays: 30 });
      if (res.ok) router.refresh();
      else setMsg({ ok: false, text: res.error ?? "Could not extend." });
    });
  }

  function revoke(userId: string, who: string) {
    if (!window.confirm(`Revoke comp Pro for ${who}? They lose Pro access immediately.`)) return;
    setMsg(null);
    startTransition(async () => {
      const res = await revokeCompPro({ userId });
      if (res.ok) router.refresh();
      else setMsg({ ok: false, text: res.error ?? "Could not revoke." });
    });
  }

  const rows = [...active, ...expired];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-6">
        <h2 className="text-lg font-semibold text-almi-ink">Grant comp Pro</h2>
        <p className="mt-1 text-sm text-almi-text-muted">
          Gives an existing user full Pro access — AI feedback on Write &amp; Speak About the Photo and
          the full-length mock — without Stripe, with an expiry. No payment, no email-verify needed.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@email.com"
            className="rounded-xl border border-almi-ink/15 bg-almi-bg px-4 py-2.5 text-sm text-almi-ink focus:border-almi-coral focus:outline-none"
          />
          <input
            type="number"
            min={1}
            max={1825}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="Days"
            aria-label="Days"
            className="rounded-xl border border-almi-ink/15 bg-almi-bg px-4 py-2.5 text-sm text-almi-ink focus:border-almi-coral focus:outline-none"
          />
        </div>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="mt-3 w-full rounded-xl border border-almi-ink/15 bg-almi-bg px-4 py-2.5 text-sm text-almi-ink focus:border-almi-coral focus:outline-none"
        />
        <button
          type="button"
          onClick={grant}
          disabled={pending || !email.trim()}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep disabled:opacity-60"
        >
          {pending ? "Working…" : "Grant comp Pro"}
        </button>
        {msg && (
          <p
            className={`mt-3 text-sm font-medium ${
              msg.ok ? "text-almi-teal" : "text-almi-coral-deep"
            }`}
          >
            {msg.text}
          </p>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-almi-ink">Comp grants</h2>
          <p className="text-xs text-almi-text-muted">
            {active.length} active · {expired.length} expired
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="mt-4 rounded-xl border border-almi-bg-peach bg-almi-bg px-4 py-6 text-center text-sm text-almi-text-muted">
            No comp grants yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-almi-bg-peach">
            <table className="w-full text-left text-sm">
              <thead className="bg-almi-bg text-xs uppercase tracking-wide text-almi-text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Granted</th>
                  <th className="px-4 py-3 font-semibold">Expires</th>
                  <th className="px-4 py-3 font-semibold">Days left</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Granted by</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-almi-bg-peach bg-almi-paper">
                {rows.map((r) => (
                  <tr key={r.userId} className={r.isActive ? "" : "opacity-60"}>
                    <td className="px-4 py-3 text-almi-ink">{r.email}</td>
                    <td className="px-4 py-3 text-almi-text-muted">{fmtDate(r.grantedAt)}</td>
                    <td className="px-4 py-3 text-almi-text-muted">{fmtDate(r.expiresAt)}</td>
                    <td className="px-4 py-3">
                      {r.isActive ? (
                        <span className="font-semibold text-almi-ink">{r.daysRemaining} d</span>
                      ) : (
                        <span className="rounded-full bg-almi-bg-peach px-2 py-0.5 text-xs font-semibold text-almi-text-muted">
                          expired
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-almi-text-muted">{r.reason ?? "—"}</td>
                    <td className="px-4 py-3 text-almi-text-muted">{r.grantedBy ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => extend(r.userId)}
                          disabled={pending}
                          className="rounded-md border border-almi-ink/15 px-2.5 py-1 text-xs font-semibold text-almi-ink hover:border-almi-coral disabled:opacity-50"
                        >
                          +30 d
                        </button>
                        {r.isActive && (
                          <button
                            type="button"
                            onClick={() => revoke(r.userId, r.email)}
                            disabled={pending}
                            className="rounded-md border border-almi-coral/40 px-2.5 py-1 text-xs font-semibold text-almi-coral-deep hover:bg-almi-coral/10 disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
