// Full-mock / practice-set aggregate. CELPIP scores each skill independently, so
// we show one practice CLB estimate per skill that the session touched — and
// NEVER a composite/overall (CELPIP has none). The honest range + most-likely CLB
// per skill comes from aggregateSession.

import Link from "next/link";
import type { CelpipAttempt, CelpipItem, CelpipSession, CelpipSubTest } from "@prisma/client";
import { aggregateSession } from "@/lib/celpip/session";
import { CLB_EXPRESS_ENTRY_MIN } from "@/lib/celpip/scale";
import { SUBTEST_LABEL, VERSION_LABEL } from "@/lib/celpip/types";
import { ClbEstimate, ESTIMATE_DISCLAIMER } from "@/components/celpip/ClbEstimate";

const SUBTEST_ORDER: CelpipSubTest[] = ["LISTENING", "READING", "WRITING", "SPEAKING"];

export function CelpipSessionResult({
  session,
  attempts,
}: {
  session: CelpipSession;
  attempts: (CelpipAttempt & { item: CelpipItem })[];
}) {
  const estimates = aggregateSession(attempts);
  const touched = SUBTEST_ORDER.filter((s) => estimates[s] !== null);
  const isMock = session.mode === "MOCK";
  // IRCC reads the CLB of EVERY skill separately, so count per skill — never
  // average into a composite. "At benchmark" = the most-likely CLB is ≥ 7.
  const atBenchmark = touched.filter((s) => {
    const clb = estimates[s]?.clb ?? 0;
    return clb >= CLB_EXPRESS_ENTRY_MIN;
  }).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">
          {session.mode === "MOCK" ? "Full mock" : "Practice set"} · result
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-almi-ink">Your practice estimates</h1>
        {isMock && session.version && (
          <p className="mt-1 text-sm text-almi-text-muted">{VERSION_LABEL[session.version]}</p>
        )}
        <p className="mt-2 text-sm text-almi-text">
          Each skill is estimated on its own CLB scale (1–12). CELPIP reports a separate level per
          skill — there is no overall score, so we don&apos;t invent one.
        </p>
      </header>

      <div className="space-y-3">
        {touched.map((s) => (
          <ClbEstimate key={s} label={SUBTEST_LABEL[s]} estimate={estimates[s]} />
        ))}
      </div>

      {isMock && touched.length > 0 && (
        <div className="rounded-2xl border border-almi-coral/30 bg-almi-coral/5 p-5">
          <p className="text-sm font-semibold text-almi-ink">
            {atBenchmark} of {touched.length} skills at ~CLB {CLB_EXPRESS_ENTRY_MIN} in this run
          </p>
          <p className="mt-1 text-sm text-almi-text">
            Express Entry and many PNPs ask for a CLB in <span className="font-semibold">every</span>{" "}
            skill — they don&apos;t average them. Use the per-skill estimates above to see where to
            focus next. Confirm the exact CLB you need with IRCC or your immigration program.
          </p>
        </div>
      )}

      <p className="rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3 text-xs text-almi-text-muted">
        {ESTIMATE_DISCLAIMER}
      </p>

      <Link
        href="/practice"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep"
      >
        Back to practice →
      </Link>
    </div>
  );
}
