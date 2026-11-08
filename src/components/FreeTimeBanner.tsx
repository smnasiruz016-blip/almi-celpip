// RR-397 · the free-48-hours banner on practice pages: hours left inside the free time, the honest "Your free 48 hours are over"
// with "Unlock for $12/month" after it, and nothing at all for paying users. Server component, no client JS.
import Link from "next/link";
import { hasPaidAccess } from "@/lib/billing/plans";
import { isTasteActive, tasteHoursLeft, TASTE_AI_LIMITS, type TasteUser } from "@/lib/billing/taste";
import { lockedCopy } from "@/lib/billing/free-access";

export function FreeTimeBanner({ user, ai }: { user: Parameters<typeof hasPaidAccess>[0] & TasteUser; ai?: "WRITING" | "SPEAKING" }) {
  if (hasPaidAccess(user)) return null;
  if (isTasteActive(user)) {
    const h = tasteHoursLeft(user);
    return (
      <div className="rounded-xl border border-almi-teal/30 bg-almi-teal/10 px-4 py-3 text-sm text-almi-ink" data-free-time="active">
        Your free 48 hours: <strong>{h} {h === 1 ? "hour" : "hours"} left</strong>, no card.
        {ai ? ` ${TASTE_AI_LIMITS[ai]} AI-scored ${ai === "WRITING" ? "Writing" : "Speaking"} is included.` : ""}{" "}
        <Link href="/pricing" className="font-medium text-almi-coral-text hover:underline">Unlock for $12/month</Link>
      </div>
    );
  }
  const c = lockedCopy(user);
  return (
    <div className="rounded-xl border border-almi-coral/30 bg-almi-coral/10 px-4 py-3 text-sm text-almi-ink" data-free-time="locked">
      <strong>{c.title}.</strong> {c.line}{" "}
      <Link href={c.href} className="font-medium text-almi-coral-text hover:underline">{c.cta}</Link>
    </div>
  );
}
