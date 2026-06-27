"use client";

import { useState } from "react";

export type AdminReviewRow = {
  id: string;
  rating: number;
  text: string;
  approved: boolean;
  createdAt: string;
  userName: string | null;
  userEmail: string;
};

function StarRow({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, rating));
  return (
    <span aria-label={`${r} out of 5 stars`}>
      <span className="text-almi-coral">{"★".repeat(r)}</span>
      <span className="text-almi-bg-peach">{"★".repeat(5 - r)}</span>
    </span>
  );
}

type Filter = "all" | "pending" | "approved";

export function AdminReviews({ rows: initial }: { rows: AdminReviewRow[] }) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approvedCount = rows.filter((r) => r.approved).length;
  const shown = rows.filter((r) =>
    filter === "all" ? true : filter === "approved" ? r.approved : !r.approved,
  );

  async function toggle(row: AdminReviewRow) {
    const next = !row.approved;
    setBusyId(row.id);
    setError(null);
    // Optimistic — revert on failure.
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, approved: next } : r)));
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, approved: next }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Update failed");
    } catch (e) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, approved: row.approved } : r)));
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-almi-text-muted">
          {approvedCount} approved / {rows.length} total. Editing a review (by its owner) resets it to
          pending.
        </p>
        <div className="flex gap-1">
          {(["all", "pending", "approved"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                filter === f ? "bg-almi-coral text-almi-ink" : "bg-almi-bg-peach text-almi-text-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm font-medium text-almi-coral-deep">{error}</p>}

      <div className="space-y-3">
        {shown.length === 0 && <p className="text-sm text-almi-text-muted">No reviews here.</p>}
        {shown.map((r) => (
          <div key={r.id} className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <StarRow rating={r.rating} />
                <p className="mt-2 text-sm text-almi-text">{r.text}</p>
                <p className="mt-2 text-xs text-almi-text-muted">
                  {r.userName?.trim() || "No name"} · {r.userEmail} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.approved ? "bg-almi-teal/15 text-almi-teal" : "bg-almi-accent/15 text-almi-accent-deep"
                  }`}
                >
                  {r.approved ? "Approved" : "Pending"}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(r)}
                  disabled={busyId === r.id}
                  className="rounded-full border border-almi-ink/15 bg-almi-paper px-3 py-1.5 text-xs font-semibold text-almi-ink hover:border-almi-coral disabled:opacity-60"
                >
                  {r.approved ? "Unapprove" : "Approve"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
