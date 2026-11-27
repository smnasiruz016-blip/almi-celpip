// READING (CELPIP-General only). Four parts (correspondence, diagram/application,
// information, viewpoints) — all share one shape: passages + questions (multiple
// choice, plus matching for the diagram part). Computer-scored: correct/total ->
// CLB. Answer keys stripped before reaching the client.

import { z } from "zod";
import type { TaskRunResult } from "@/lib/celpip/registry";
import { markObjective, objectiveResponseSchema } from "@/lib/celpip/tasks/objective";

export { objectiveResponseSchema };

const optionSchema = z.object({ id: z.string(), text: z.string() });

// RR-418 · two more kinds, from the full Reading tests: "blank" (a drop-down inline in the second text — the reply, email or comment —
// at its [n] mark) and "paragraph" (which paragraph A–D holds the statement, or E = not given). Every kind is marked by option id.
export const readingPayloadSchema = z.object({
  passages: z.array(z.object({ id: z.string(), heading: z.string().optional(), body: z.string(), kind: z.string().optional() })),
  questions: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["mcq", "match", "blank", "paragraph"]),
      stem: z.string(),
      options: z.array(optionSchema).optional(),
      answer: z.string(),
      explanation: z.string().optional(),
      blank: z.number().int().positive().optional(),
      passage: z.string().optional(),
    }),
  ),
});
export type ReadingPayload = z.infer<typeof readingPayloadSchema>;

export function scoreReading(
  payload: ReadingPayload,
  response: z.infer<typeof objectiveResponseSchema>,
): TaskRunResult {
  // Both mcq and match answers are option ids -> exact compare.
  return markObjective(
    payload.questions.map((q) => ({ id: q.id, answer: q.answer, exact: true })),
    response,
  );
}
