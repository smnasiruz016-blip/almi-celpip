// Honest single-attempt / step result. Shows the per-skill practice CLB estimate
// (range + most-likely CLB), the points earned, and any AI trait feedback. CELPIP
// has no composite/overall, so a single attempt simply shows its own skill
// estimate. Rich per-task review UIs land with each skill's phase.

import Link from "next/link";
import type { CelpipAttempt, CelpipItem } from "@prisma/client";
import type { TaskDef } from "@/lib/celpip/registry";
import { SUBTEST_LABEL } from "@/lib/celpip/types";
import type { ClbEstimate as ClbEstimateValue } from "@/lib/celpip/scale";
import { ClbEstimate, ESTIMATE_DISCLAIMER } from "@/components/celpip/ClbEstimate";
import { buildObjectiveReview } from "@/lib/celpip/review";

function ObjectiveReview({ def, item, attempt }: { def: TaskDef; item: CelpipItem; attempt: CelpipAttempt }) {
  const review = buildObjectiveReview(def.taskType, item.payload, attempt.response);
  if (!review || review.total === 0) return null;
  return (
    <section className="rounded-2xl border border-almi-bg-peach bg-almi-bg p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-almi-text-muted">
        Answer review · {review.correct}/{review.total} correct
      </h2>
      <ul className="mt-3 space-y-3">
        {review.rows.map((r, i) => (
          <li key={i} className="rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3">
            <div className="flex items-start gap-2">
              <span aria-hidden className={r.ok ? "text-almi-teal" : "text-almi-coral-deep"}>
                {r.ok ? "✓" : "✗"}
              </span>
              <p className="text-sm font-medium text-almi-ink">{r.label}</p>
            </div>
            <p className="mt-1 pl-6 text-sm text-almi-text">
              Your answer: <span className={r.ok ? "text-almi-teal" : "text-almi-coral-deep"}>{r.your}</span>
            </p>
            {!r.ok && (
              <p className="pl-6 text-sm text-almi-text">
                Correct: <span className="font-medium text-almi-ink">{r.correct}</span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

type AnyFeedback =
  | ({
      strengths?: string[];
      improvements?: string[];
      overallComment?: string;
    } & Record<string, unknown>)
  | null;

// The four CELPIP scoring criteria — Writing and Speaking share Content/Coherence,
// Vocabulary and Task Fulfillment; the fourth differs (Readability vs Listenability).
const TRAIT_LABEL: Record<string, string> = {
  contentCoherence: "Content & coherence",
  vocabulary: "Vocabulary",
  readability: "Readability",
  listenability: "Listenability",
  taskFulfillment: "Task fulfillment",
};
const TRAIT_LEVELS = new Set(["strong", "adequate", "limited"]);
const TRAIT_TONE: Record<string, string> = {
  strong: "bg-almi-teal/15 text-almi-teal",
  adequate: "bg-almi-accent/15 text-almi-accent-deep",
  limited: "bg-almi-coral/15 text-almi-coral-deep",
};

function TraitGrid({ feedback }: { feedback: AnyFeedback }) {
  if (!feedback) return null;
  const traits = Object.entries(feedback).filter(
    ([, v]) => typeof v === "string" && TRAIT_LEVELS.has(v as string),
  ) as [string, string][];
  if (traits.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {traits.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-2 rounded-lg border border-almi-bg-peach bg-almi-paper px-3 py-2">
          <span className="text-sm text-almi-text">{TRAIT_LABEL[k] ?? k}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${TRAIT_TONE[v] ?? ""}`}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function FeedbackBlock({ feedback }: { feedback: AnyFeedback }) {
  if (!feedback) return null;
  return (
    <div className="space-y-4">
      <TraitGrid feedback={feedback} />
      {feedback.overallComment && <p className="text-sm text-almi-text">{feedback.overallComment}</p>}
      {feedback.strengths && feedback.strengths.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-almi-teal">What worked</p>
          <ul className="mt-1 space-y-1 text-sm text-almi-text">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex gap-2"><span aria-hidden className="text-almi-teal">✓</span>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {feedback.improvements && feedback.improvements.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">Improvement opportunities</p>
          <ul className="mt-1 space-y-1 text-sm text-almi-text">
            {feedback.improvements.map((s, i) => (
              <li key={i} className="flex gap-2"><span aria-hidden className="text-almi-accent-deep">→</span>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CelpipResult({
  def,
  item,
  attempt,
  variant = "single",
}: {
  def: TaskDef;
  item: CelpipItem;
  attempt: CelpipAttempt;
  variant?: "single" | "step";
}) {
  const estimate = (attempt.clbEstimate as ClbEstimateValue | null) ?? null;
  const feedback = (attempt.feedback as AnyFeedback) ?? null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">
          {def.label} · practice result
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-almi-ink">
          {variant === "step" ? "This question" : "Your practice estimate"}
        </h1>
        <p className="mt-2 text-sm text-almi-text-muted">
          {attempt.pointsEarned} / {attempt.pointsMax} practice points · {item.title}
        </p>
      </header>

      <ClbEstimate label={`${SUBTEST_LABEL[attempt.subTest]} (this item)`} estimate={estimate} />

      <ObjectiveReview def={def} item={item} attempt={attempt} />

      {feedback && (
        <section className="rounded-2xl border border-almi-bg-peach bg-almi-bg p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-almi-text-muted">Feedback</h2>
          <div className="mt-3"><FeedbackBlock feedback={feedback} /></div>
        </section>
      )}

      {variant === "single" && (
        <>
          <p className="rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3 text-xs text-almi-text-muted">
            {ESTIMATE_DISCLAIMER} We show a range, not a single number, because honest prep means
            showing the uncertainty.
          </p>
          <Link
            href={`/practice/${def.slug}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep"
          >
            Practise again →
          </Link>
        </>
      )}
    </div>
  );
}
