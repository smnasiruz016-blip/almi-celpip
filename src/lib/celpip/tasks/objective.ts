// Shared deterministic marking for the objective sub-tests (Listening + Reading).
// Both sub-tests reduce to "count correct answers out of total"; the fraction is
// correct/total, which the scale layer turns into an honest 0–500 estimate.

import { z } from "zod";
import type { TaskRunResult } from "@/lib/celpip/registry";

// The user's answers, keyed by question/gap id. MCQ → option id (string);
// gap fill / matching → typed text or selected id (string).
export const objectiveResponseSchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
});
export type ObjectiveResponse = z.infer<typeof objectiveResponseSchema>;

/** Normalise a free-text answer for lenient gap-fill comparison. */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,;:!?]+$/g, "");
}

function firstValue(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export type AnswerKey = { id: string; answer: string; exact?: boolean };

/** Mark a set of answers against a key. `exact` items (MCQ/matching by id) must
 *  match exactly; the rest use lenient normalised comparison (gap fill). */
export function markObjective(
  key: AnswerKey[],
  response: ObjectiveResponse,
): TaskRunResult {
  let correct = 0;
  const detail: { id: string; correct: boolean }[] = [];
  for (const k of key) {
    const given = firstValue(response.answers[k.id]);
    const ok = k.exact
      ? given.trim() === k.answer.trim()
      : normalize(given) === normalize(k.answer);
    if (ok) correct += 1;
    detail.push({ id: k.id, correct: ok });
  }
  const total = key.length || 1;
  return {
    pointsEarned: correct,
    pointsMax: key.length,
    fraction: correct / total,
    detail,
  };
}
