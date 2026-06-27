// WRITING (CELPIP-General only). Two tasks: WRITING_EMAIL (respond to a situation
// with an email) and WRITING_SURVEY (choose between options and justify). An AI
// rater returns qualitative TRAIT levels against the FOUR CELPIP writing
// criteria + honest notes, converted to a conservative CLB estimate. General
// English — no clinical/profession context.
//
// Structured output validated with Zod AFTER parsing (Anthropic's structured
// endpoint rejects min/max/items; keep the request plain, enforce shape in code).

import { z } from "zod";

export const writingEmailPayloadSchema = z.object({
  situation: z.string(),
  instruction: z.string(),
  wordMin: z.number().int().nonnegative(),
  wordMax: z.number().int().nonnegative(),
});
export const writingSurveyPayloadSchema = z.object({
  topic: z.string(),
  optionA: z.string(),
  optionB: z.string(),
  instruction: z.string(),
  wordMin: z.number().int().nonnegative(),
  wordMax: z.number().int().nonnegative(),
});
export const writingResponseSchema = z.object({ text: z.string() });
export type WritingResponse = z.infer<typeof writingResponseSchema>;

const TRAIT = z.enum(["strong", "adequate", "limited"]);

// The four official CELPIP writing assessment criteria.
export const writingFeedbackSchema = z.object({
  contentCoherence: TRAIT, // ideas relevant, organised, easy to follow
  vocabulary: TRAIT, // range, precision, appropriacy
  readability: TRAIT, // grammar, mechanics, sentence structure — easy to read
  taskFulfillment: TRAIT, // addresses the task fully, right tone/format/length
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  overallComment: z.string(),
});
export type WritingFeedback = z.infer<typeof writingFeedbackSchema>;

export type AiScore = {
  pointsEarned: number;
  pointsMax: number;
  fraction: number;
  feedback: WritingFeedback;
  telemetry: { aiModel: string; costCents: number; latencyMs: number };
};

/** Evaluate a CELPIP writing task against the four criteria.
 *  Phase 0 wires the schema + dispatch; the Anthropic call lands in Phase 2. */
export async function evaluateWriting(_input: {
  taskType: "WRITING_EMAIL" | "WRITING_SURVEY";
  payload: unknown;
  response: WritingResponse;
  userId: string;
}): Promise<AiScore> {
  throw new Error("Writing AI grading lands in Phase 2");
}
