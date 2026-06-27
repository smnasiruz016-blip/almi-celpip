// Builds a post-submission review for objective (Listening/Reading) attempts:
// for each question, the user's answer vs the correct answer. Safe to show now —
// the attempt is already scored, so the answer key is no longer a secret. Pure
// function (server-usable), reads the stored item payload + the user's response.
//
// CELPIP objective tasks are all multiple-choice (Listening, every Reading part)
// or simple matching (Reading — Diagram), so one MCQ-style review covers them all.

import type { CelpipTaskType } from "@prisma/client";
import { CELPIP_TASKS } from "@/lib/celpip/registry";

export type ReviewRow = { label: string; your: string; correct: string; ok: boolean };
export type Review = { rows: ReviewRow[]; correct: number; total: number };

function answerOf(response: unknown, id: string): string {
  const answers = (response as { answers?: Record<string, unknown> } | null)?.answers ?? {};
  const v = answers[id];
  if (Array.isArray(v)) return String(v[0] ?? "");
  return v == null ? "" : String(v);
}

type Option = { id: string; text: string };
type Question = { id: string; stem: string; options?: Option[]; answer: string };

function optionText(options: Option[] | undefined, id: string): string {
  return options?.find((o) => o.id === id)?.text ?? id;
}

/** Returns null for non-objective task types (Writing/Speaking use AI feedback). */
export function buildObjectiveReview(
  taskType: CelpipTaskType,
  payload: unknown,
  response: unknown,
): Review | null {
  const def = CELPIP_TASKS[taskType];
  if (!def || def.scoringMode !== "DETERMINISTIC") return null;

  const p = (payload ?? {}) as Record<string, unknown>;
  const questions = (p.questions as Question[] | undefined) ?? [];
  const rows: ReviewRow[] = [];

  for (const q of questions) {
    const your = answerOf(response, q.id);
    rows.push({
      label: q.stem,
      your: your ? optionText(q.options, your) : "—",
      correct: optionText(q.options, q.answer),
      ok: your.trim() === q.answer.trim(),
    });
  }

  return { rows, correct: rows.filter((r) => r.ok).length, total: rows.length };
}
