// The single source of truth for the CELPIP scale in AlmiCELPIP.
//
// CELPIP reports a SEPARATE level for each skill (Listening, Reading, Writing,
// Speaking). The CELPIP level is calibrated 1:1 to the Canadian Language
// Benchmark (CLB): CELPIP Level N = CLB N (verified 2026 against celpip.ca's
// score comparison chart). There is NO composite — IRCC reads each skill's CLB
// on its own. Below functional level (under CLB 4) CELPIP reports "M" (minimal).
//
// AlmiCELPIP turns practice performance into an HONEST CLB estimate RANGE per
// skill — deliberately wide, because a practice task is not the calibrated live
// exam. The fraction→CLB buckets are a documented practice heuristic, NOT
// CELPIP's scoring. We always tell the user to confirm the CLB they need with
// IRCC / their immigration program.

import type { Range } from "@/lib/celpip/types";

export const CLB_MIN = 1;
export const CLB_MAX = 12;
// Common reference points (orientation only — NOT a promise):
export const CLB_EXPRESS_ENTRY_MIN = 7; // typical Express Entry / many PNP minimum
export const CLB_STRONG = 9; // CLB 9 = maximum CRS language points
export const CLB_CITIZENSHIP_LS = 4; // citizenship (LS) functional benchmark

/** Clamp an estimate to the CLB 1–12 grid. */
export function snapToScale(n: number): number {
  return Math.min(CLB_MAX, Math.max(CLB_MIN, Math.round(n)));
}

export function snapRange(lo: number, hi: number): Range {
  const a = snapToScale(Math.min(lo, hi));
  const b = snapToScale(Math.max(lo, hi));
  return [a, b] as const;
}

// Coarse performance buckets. `fraction` is 0..1 — the share of the available
// quality signal earned (objective: correct/total; productive: AI trait level
// normalised to 0..1). Each maps to a wide, humble CLB range. Overlapping on
// purpose — we never claim a precise CELPIP level.
const BUCKETS: { min: number; range: Range }[] = [
  { min: 0.0, range: [1, 3] },
  { min: 0.3, range: [3, 5] },
  { min: 0.48, range: [4, 6] },
  { min: 0.6, range: [5, 7] },
  { min: 0.72, range: [6, 8] },
  { min: 0.82, range: [7, 9] },
  { min: 0.9, range: [8, 10] },
  { min: 0.95, range: [9, 11] },
  { min: 0.98, range: [10, 12] },
];

/** Map a 0..1 performance fraction to a practice-estimate CLB range. */
export function fractionToRange(fraction: number): Range {
  const f = Math.min(1, Math.max(0, fraction));
  let chosen = BUCKETS[0];
  for (const b of BUCKETS) {
    if (f >= b.min) chosen = b;
  }
  return snapRange(chosen.range[0], chosen.range[1]);
}

export function rangeMidpoint(range: Range): number {
  return (range[0] + range[1]) / 2;
}

export type ClbEstimate = { lo: number; hi: number; clb: number };

/** Turn a 0..1 fraction into a full estimate: a CLB range + the most-likely CLB
 *  (the midpoint), clamped to the 1–12 grid. */
export function fractionToEstimate(fraction: number): ClbEstimate {
  const [lo, hi] = fractionToRange(fraction);
  return { lo, hi, clb: snapToScale(rangeMidpoint([lo, hi])) };
}

/** Honest readiness label relative to the common Express Entry CLB 7 benchmark.
 *  A label for orientation, never a number we'd defend as a CELPIP level. */
export type ReadinessBand =
  | "Below CLB 4"
  | "Developing"
  | "Approaching CLB 7"
  | "At/above CLB 7"
  | "Strong (CLB 9+)";

export function readinessBand(midpoint: number): ReadinessBand {
  if (midpoint >= CLB_STRONG) return "Strong (CLB 9+)";
  if (midpoint >= CLB_EXPRESS_ENTRY_MIN) return "At/above CLB 7";
  if (midpoint >= 5) return "Approaching CLB 7";
  if (midpoint >= CLB_CITIZENSHIP_LS) return "Developing";
  return "Below CLB 4";
}

/** Format a CLB range, e.g. "CLB 7–9" (or a single "CLB 8" when lo===hi). */
export function formatRange(range: Range): string {
  return range[0] === range[1] ? `CLB ${range[0]}` : `CLB ${range[0]}–${range[1]}`;
}
