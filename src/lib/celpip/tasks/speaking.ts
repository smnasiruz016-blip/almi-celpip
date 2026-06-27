// SPEAKING (CELPIP-General + LS). Eight tasks (advice, personal experience,
// describe a scene, predictions, compare & persuade, difficult situation,
// opinions, unusual situation). Some show an image. We grade a TRANSCRIPT (audio
// -> Whisper) against the FOUR CELPIP speaking criteria — never accent or audio.
//
// Structured output validated with Zod AFTER parsing.

import { z } from "zod";

export const speakingPayloadSchema = z.object({
  taskPrompt: z.string(),
  prepSeconds: z.number().int().nonnegative(),
  speakSeconds: z.number().int().nonnegative(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
});
export const speakingResponseSchema = z.object({ transcript: z.string() });
export type SpeakingResponse = z.infer<typeof speakingResponseSchema>;

const TRAIT = z.enum(["strong", "adequate", "limited"]);

// The four official CELPIP speaking assessment criteria.
export const speakingFeedbackSchema = z.object({
  contentCoherence: TRAIT,
  vocabulary: TRAIT,
  listenability: TRAIT, // pronunciation-free: grammar, flow, ease of understanding from words
  taskFulfillment: TRAIT,
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  overallComment: z.string(),
});
export type SpeakingFeedback = z.infer<typeof speakingFeedbackSchema>;

export type AiScore = {
  pointsEarned: number;
  pointsMax: number;
  fraction: number;
  feedback: SpeakingFeedback;
  telemetry: { aiModel: string; costCents: number; latencyMs: number };
};

/** Evaluate a CELPIP speaking transcript against the four criteria.
 *  Phase 0 wires the schema + dispatch; the Anthropic call lands in Phase 3. */
export async function evaluateSpeaking(_input: {
  payload: unknown;
  response: SpeakingResponse;
  userId: string;
}): Promise<AiScore> {
  throw new Error("Speaking AI grading lands in Phase 3");
}
