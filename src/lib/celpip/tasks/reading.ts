// READING (CELPIP-General only). Four parts (correspondence, diagram/application,
// information, viewpoints) — all share one shape: passages + questions (multiple
// choice, plus matching for the diagram part). Computer-scored: correct/total ->
// CLB. Answer keys stripped before reaching the client.

import { z } from "zod";
import type { TaskRunResult } from "@/lib/celpip/registry";
import { markObjective, objectiveResponseSchema } from "@/lib/celpip/tasks/objective";

export { objectiveResponseSchema };

const optionSchema = z.object({ id: z.string(), text: z.string() });

export const readingPayloadSchema = z.object({
  passages: z.array(z.object({ id: z.string(), heading: z.string().optional(), body: z.string() })),
  questions: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["mcq", "match"]),
      stem: z.string(),
      options: z.array(optionSchema).optional(),
      answer: z.string(),
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
