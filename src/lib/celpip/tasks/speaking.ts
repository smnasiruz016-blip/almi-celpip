// SPEAKING (CELPIP-General + LS). Eight tasks (advice, personal experience,
// describe a scene, predictions, compare & persuade, difficult situation,
// opinions, unusual situation). Some show an image. We grade a TRANSCRIPT (audio
// -> Whisper) against the FOUR CELPIP speaking criteria — never accent or audio.
//
// Structured output validated with Zod AFTER parsing.

import { z } from "zod";
import { getAnthropicClient, recordCost } from "@/lib/ai/anthropic-client";
import { MODELS } from "@/lib/ai/models";

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

const POINTS_MAX = 12; // 4 criteria × 3 trait levels
const LEVEL_VALUE: Record<z.infer<typeof TRAIT>, number> = {
  strong: 1.0,
  adequate: 0.6,
  limited: 0.3,
};

type SpeakingPayload = z.infer<typeof speakingPayloadSchema>;

const SYSTEM = `You are an honest speaking assessor for AlmiCELPIP, a CELPIP-General practice tool. CELPIP is a Canadian English proficiency test used for immigration and citizenship.

You rate a candidate's CELPIP Speaking response. The candidate recorded a short spoken answer to a task; their audio has been automatically transcribed, and you are judging the TRANSCRIPT. Judge it against the FOUR official CELPIP speaking criteria. Rules:
- You are grading TEXT from an automatic transcript. You CANNOT hear the audio. NEVER judge or mention accent, pronunciation, intonation, or audio quality — you have no access to them and CELPIP fairness forbids penalising accent.
- The transcript comes from speech recognition and may contain small errors, missing punctuation, or filler words ("um", "like"). Do not penalise the candidate for likely transcription artifacts; judge the substance of what they said.
- All content here is original to AlmiCELPIP. Never reference or reproduce real CELPIP test material.
- This is a PRACTICE ESTIMATE, not an official CELPIP result. Never state a CELPIP level or CLB number, and never promise a score.
- Be honest and constructive. If the response is limited, say so plainly but kindly. Do not inflate.
- Banned words: "weak", "poor", "wrong", "failed". Prefer "improvement opportunity".

The four criteria (judged from the words only):
- contentCoherence: are the ideas relevant, developed, well organised and easy to follow?
- vocabulary: range, precision and appropriacy of word choice for the task and listener.
- listenability: how easy the response is to follow FROM THE WORDS — grammar, sentence flow, connectors, clarity. This is NOT pronunciation; it is whether the language itself is easy to understand.
- taskFulfillment: does it fully do what the task asks, in the right tone/register, with enough developed content for the speaking time?

Return ONLY a JSON object, no prose around it, with exactly these keys:
{
  "contentCoherence": "strong" | "adequate" | "limited",
  "vocabulary": "strong" | "adequate" | "limited",
  "listenability": "strong" | "adequate" | "limited",
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

/** Evaluate a CELPIP speaking transcript against the four criteria with Claude
 *  Sonnet. Grades the words only — never accent or audio. Returns conservative
 *  practice points + an honest fraction (mapped to a CLB range by the caller),
 *  the trait feedback, and cost telemetry. */
export async function evaluateSpeaking(input: {
  payload: SpeakingPayload;
  response: SpeakingResponse;
  userId: string;
}): Promise<AiScore> {
  const { payload, response, userId } = input;
  const words = wordCount(response.transcript);

  // Image tasks (Describe a Scene, Unusual Situation) have no real image here, so
  // the rater is given the scene description (imageAlt) as loose context and told
  // not to fact-check details against a picture it cannot see.
  const sceneContext = payload.imageAlt
    ? `\nThe task refers to an image. You cannot see it; for context only, the image shows: "${payload.imageAlt}". Do not penalise the candidate for visual details you cannot verify — judge how clearly and fully they describe.`
    : "";

  const userMessage = `CELPIP Speaking task. Preparation time: ${payload.prepSeconds}s. Speaking time: ${payload.speakSeconds}s. The transcript is ${words} words.
TASK PROMPT:
${payload.taskPrompt}${sceneContext}

CANDIDATE'S TRANSCRIBED RESPONSE:
${response.transcript}

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
      feature: "speaking.evaluate",
      model: MODELS.SONNET,
      usage,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  const costCents = await recordCost({
    userId,
    feature: "speaking.evaluate",
    model: MODELS.SONNET,
    usage,
    success: true,
  });

  const feedback = speakingFeedbackSchema.parse(extractJson(raw));

  const traits = [
    feedback.contentCoherence,
    feedback.vocabulary,
    feedback.listenability,
    feedback.taskFulfillment,
  ];
  let fraction = traits.reduce((s, t) => s + LEVEL_VALUE[t], 0) / traits.length;
  // A very short response can't demonstrate the criteria for the speaking time.
  // Conservative speech estimate ~1.3 words/sec; cap if well under 40% of that.
  const expectedWords = payload.speakSeconds * 1.3;
  if (words < expectedWords * 0.4) fraction *= 0.6;
  fraction = Math.min(1, Math.max(0, fraction));

  return {
    pointsEarned: Math.round(fraction * POINTS_MAX),
    pointsMax: POINTS_MAX,
    fraction,
    feedback,
    telemetry: { aiModel: MODELS.SONNET, costCents, latencyMs: Date.now() - started },
  };
}
