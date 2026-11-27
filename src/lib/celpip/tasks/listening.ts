// LISTENING (CELPIP-General + LS). Six parts (problem solving, daily-life
// conversation, information, news item, discussion, viewpoints) — all share one
// shape: an audio script (rendered to speech server-side, plays once) + multiple
// choice questions. Computer-scored: correct/total -> CLB. Answer keys stripped
// before reaching the client.

import { z } from "zod";
import type { TaskRunResult } from "@/lib/celpip/registry";
import { markObjective, objectiveResponseSchema } from "@/lib/celpip/tasks/objective";

export { objectiveResponseSchema };

const speakerSchema = z.object({ role: z.string(), voice: z.string() });
const mcqQuestionSchema = z.object({
  id: z.string(),
  stem: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })),
  answer: z.string(),
  explanation: z.string().optional(), // RR-418: shown as "Why" after submit
  section: z.string().optional(), // RR-418: Part 1 of a full test — the section the question follows
});

export const listeningPayloadSchema = z.object({
  audioScript: z.string(),
  speakers: z.array(speakerSchema),
  questions: z.array(mcqQuestionSchema),
  // RR-418: Listening Part 1 of a full test plays in 3 sections, its questions in between (each section its own pre-rendered clip)
  sections: z.array(z.object({ id: z.string(), label: z.string(), audioUrl: z.string(), audioDurationSec: z.number().nullable().optional() })).optional(),
});
export type ListeningPayload = z.infer<typeof listeningPayloadSchema>;

export function scoreListening(
  payload: ListeningPayload,
  response: z.infer<typeof objectiveResponseSchema>,
): TaskRunResult {
  return markObjective(
    payload.questions.map((q) => ({ id: q.id, answer: q.answer, exact: true })),
    response,
  );
}
