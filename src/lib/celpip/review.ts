// Builds a post-submission review for objective (Listening/Reading) attempts:
// for each question, the user's answer vs the correct answer. Safe to show now —
// the attempt is already scored, so the answer key is no longer a secret. Pure
// function (server-usable), reads the stored item payload + the user's response.
//
// CELPIP objective tasks are all multiple-choice (Listening, every Reading part)
// or simple matching (Reading — Diagram), so one MCQ-style review covers them all.
// RR-418 · plus Reading blanks (a drop-down in the second text) and paragraph questions (A–E), and each question's explanation, shown as
// "Why" — only when the question has one.

import type { CelpipTaskType } from "@prisma/client";
import { CELPIP_TASKS } from "@/lib/celpip/registry";

export type ReviewRow = { label: string; your: string; correct: string; ok: boolean; why: string | null };
export type Review = { rows: ReviewRow[]; correct: number; total: number };

function answerOf(response: unknown, id: string): string {
  const answers = (response as { answers?: Record<string, unknown> } | null)?.answers ?? {};
  const v = answers[id];
  if (Array.isArray(v)) return String(v[0] ?? "");
  return v == null ? "" : String(v);
}

type Option = { id: string; text: string };
type Question = { id: string; stem: string; options?: Option[]; answer: string; explanation?: string; kind?: string };

function optionText(options: Option[] | undefined, id: string): string {
  return options?.find((o) => o.id === id)?.text ?? id;
}

/** the explanation to show under a question, or null when it has none (an empty or blank text counts as none) */
export const whyOf = (q: { explanation?: unknown }): string | null => (typeof q.explanation === "string" && q.explanation.trim() ? q.explanation.trim() : null);

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
    const label = q.kind === "paragraph" ? `${q.stem} (paragraph A–E)` : q.stem;
    rows.push({
      label,
      your: your ? optionText(q.options, your) : "—",
      correct: optionText(q.options, q.answer),
      ok: your.trim() === q.answer.trim(),
      why: whyOf(q),
    });
  }

  return { rows, correct: rows.filter((r) => r.ok).length, total: rows.length };
}
