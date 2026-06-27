// WRITING (CELPIP-General only). Two tasks: WRITING_EMAIL (respond to a situation
// with an email) and WRITING_SURVEY (choose between options and justify). An AI
// rater returns qualitative TRAIT levels against the FOUR CELPIP writing
// criteria + honest notes, converted to a conservative CLB estimate. General
// English — no clinical/profession context.
//
// Structured output validated with Zod AFTER parsing (Anthropic's structured
// endpoint rejects min/max/items; keep the request plain, enforce shape in code).

import { z } from "zod";
import { getAnthropicClient, recordCost } from "@/lib/ai/anthropic-client";
import { MODELS } from "@/lib/ai/models";

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

const POINTS_MAX = 12; // 4 criteria × 3 trait levels
const LEVEL_VALUE: Record<z.infer<typeof TRAIT>, number> = {
  strong: 1.0,
  adequate: 0.6,
  limited: 0.3,
};

const SYSTEM = `You are an honest writing assessor for AlmiCELPIP, a CELPIP-General practice tool. CELPIP is a Canadian English proficiency test used for immigration and citizenship.

You rate a candidate's CELPIP Writing response — either an Email (responding to an everyday situation) or a Survey Response (choosing one of two options and justifying it). Judge it against the FOUR official CELPIP writing criteria. Rules:
- All content here is original to AlmiCELPIP. Never reference or reproduce real CELPIP test material.
- This is a PRACTICE ESTIMATE, not an official CELPIP result. Never state a CELPIP level or CLB number, and never promise a score.
- Be honest and constructive. If the response is limited, say so plainly but kindly. Do not inflate.
- Banned words: "weak", "poor", "wrong", "failed". Prefer "improvement opportunity".
- Judge only what the candidate wrote. Everyday Canadian English — there is no profession or clinical content.
- For a Survey Response, the candidate is NOT judged on which option they chose, only on how well they support it.

The four criteria:
- contentCoherence: are the ideas relevant, complete, well organised and easy to follow? Does every part of the task get addressed?
- vocabulary: range, precision and appropriacy of word choice for the situation and reader.
- readability: grammar, spelling, punctuation and sentence structure — is it easy to read?
- taskFulfillment: does it fully do what the task asks, in the right tone/format/register, at an appropriate length?

Return ONLY a JSON object, no prose around it, with exactly these keys:
{
  "contentCoherence": "strong" | "adequate" | "limited",
  "vocabulary": "strong" | "adequate" | "limited",
  "readability": "strong" | "adequate" | "limited",
  "taskFulfillment": "strong" | "adequate" | "limited",
  "strengths": string[],        // 1-3 short, specific
  "improvements": string[],     // 1-3 short, specific, actionable
  "overallComment": string      // one or two honest sentences
}`;

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model output");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

type EmailPayload = z.infer<typeof writingEmailPayloadSchema>;
type SurveyPayload = z.infer<typeof writingSurveyPayloadSchema>;

/** Build the task-specific portion of the user message. Email and Survey present
 *  different source material, so the rater sees the right context for each. */
function taskContext(
  taskType: "WRITING_EMAIL" | "WRITING_SURVEY",
  payload: EmailPayload | SurveyPayload,
): { kind: string; body: string; wordMin: number } {
  if (taskType === "WRITING_EMAIL") {
    const p = payload as EmailPayload;
    return {
      kind: "Email",
      wordMin: p.wordMin,
      body: `Expected length: ${p.wordMin}–${p.wordMax} words.
SITUATION the candidate had to respond to:
${p.situation}
TASK INSTRUCTION:
${p.instruction}`,
    };
  }
  const p = payload as SurveyPayload;
  return {
    kind: "Survey Response",
    wordMin: p.wordMin,
    body: `Expected length: ${p.wordMin}–${p.wordMax} words.
SURVEY TOPIC:
${p.topic}
Option A: ${p.optionA}
Option B: ${p.optionB}
TASK INSTRUCTION:
${p.instruction}`,
  };
}

/** Evaluate a CELPIP writing task against the four criteria with Claude Sonnet.
 *  Returns conservative practice points + an honest fraction (mapped to a CLB
 *  range by the caller), the trait feedback, and cost telemetry. */
export async function evaluateWriting(input: {
  taskType: "WRITING_EMAIL" | "WRITING_SURVEY";
  payload: EmailPayload | SurveyPayload;
  response: WritingResponse;
  userId: string;
}): Promise<AiScore> {
  const { taskType, payload, response, userId } = input;
  const words = wordCount(response.text);
  const ctx = taskContext(taskType, payload);

  const userMessage = `CELPIP Writing — ${ctx.kind}. The candidate wrote ${words} words.
${ctx.body}

CANDIDATE'S RESPONSE:
${response.text}

Assess the response against the four criteria and return the JSON object.`;

  const client = getAnthropicClient();
  const started = Date.now();
  let raw = "";
  let usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  try {
    const msg = await client.messages.create({
      model: MODELS.SONNET,
      max_tokens: 700,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage }],
    });
    const block = msg.content.find((c) => c.type === "text");
    raw = block && block.type === "text" ? block.text : "";
    usage = {
      inputTokens: msg.usage.input_tokens,
      outputTokens: msg.usage.output_tokens,
      cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: msg.usage.cache_creation_input_tokens ?? 0,
    };
  } catch (err) {
    await recordCost({
      userId,
      feature: "writing.evaluate",
      model: MODELS.SONNET,
      usage,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  const costCents = await recordCost({
    userId,
    feature: "writing.evaluate",
    model: MODELS.SONNET,
    usage,
    success: true,
  });

  const feedback = writingFeedbackSchema.parse(extractJson(raw));

  const traits = [
    feedback.contentCoherence,
    feedback.vocabulary,
    feedback.readability,
    feedback.taskFulfillment,
  ];
  let fraction = traits.reduce((s, t) => s + LEVEL_VALUE[t], 0) / traits.length;
  // A response well under the task length can't demonstrate the criteria — cap it.
  if (words < ctx.wordMin * 0.6) fraction *= 0.6;
  fraction = Math.min(1, Math.max(0, fraction));

  return {
    pointsEarned: Math.round(fraction * POINTS_MAX),
    pointsMax: POINTS_MAX,
    fraction,
    feedback,
    telemetry: { aiModel: MODELS.SONNET, costCents, latencyMs: Date.now() - started },
  };
}
