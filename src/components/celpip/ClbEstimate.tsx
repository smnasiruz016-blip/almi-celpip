// Honest per-skill CLB display. CELPIP reports each skill (Listening, Reading,
// Writing, Speaking) on its own level, calibrated 1:1 to the Canadian Language
// Benchmark (CLB 1–12), with NO composite/overall — so we show a single estimate
// RANGE (lo–hi) plus the most-likely CLB, never a precise number, and always the
// standing "practice estimate, confirm the CLB you need with IRCC" disclaimer.

import { formatRange, CLB_EXPRESS_ENTRY_MIN } from "@/lib/celpip/scale";
import type { ClbEstimate as ClbEstimateValue } from "@/lib/celpip/scale";

export const ESTIMATE_DISCLAIMER =
  "Practice estimate only — not an official CELPIP result. Confirm the CLB you need with IRCC or your immigration program.";

export function ClbEstimate({
  label,
  estimate,
}: {
  label: string;
  estimate: ClbEstimateValue | null;
}) {
  if (!estimate) {
    return (
      <div className="rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3">
        <p className="text-sm font-semibold text-almi-ink">{label}</p>
        <p className="mt-1 text-xs text-almi-text-muted">Not enough practice yet.</p>
      </div>
    );
  }
  const atBenchmark = estimate.hi >= CLB_EXPRESS_ENTRY_MIN;
  return (
    <div className="rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-almi-ink">{label}</p>
        <span className="rounded-full bg-almi-coral/10 px-2.5 py-0.5 text-sm font-bold text-almi-coral-deep">
          ~CLB {estimate.clb}
        </span>
      </div>
      <p className="mt-1 text-sm text-almi-text">
        Estimated {formatRange([estimate.lo, estimate.hi])}
      </p>
      <p className="mt-1 text-xs text-almi-text-muted">
        {atBenchmark
          ? `Within reach of CLB ${CLB_EXPRESS_ENTRY_MIN} — the common Express Entry / PNP minimum.`
          : `Below the common CLB ${CLB_EXPRESS_ENTRY_MIN} benchmark. Confirm the CLB you need with IRCC.`}
      </p>
    </div>
  );
}
