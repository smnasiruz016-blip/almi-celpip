// Shared CELPIP domain primitives.
//
// CELPIP reports a SEPARATE level per skill (Listening, Reading, Writing,
// Speaking), calibrated 1:1 to the Canadian Language Benchmark (CLB 1-12). No
// composite. The General/LS split is a session concept (General = 4 skills; LS =
// Listening + Speaking). AlmiCELPIP shows an honest CLB estimate RANGE per skill
// and always tells the user to confirm the CLB they need with IRCC.

import type { CelpipSubTest, CelpipVersion } from "@prisma/client";

export type { CelpipSubTest, CelpipTaskType, CelpipVersion } from "@prisma/client";

// A practice-estimate CLB range, e.g. [7, 9].
export type Range = readonly [number, number];

// Per-skill practice estimate. null = not enough evidence yet.
export type ClbEstimate = { lo: number; hi: number; clb: number } | null;

export const SUBTEST_LABEL: Record<CelpipSubTest, string> = {
  LISTENING: "Listening",
  READING: "Reading",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};

// Which sub-tests each CELPIP version includes.
export const VERSION_SUBTESTS: Record<CelpipVersion, CelpipSubTest[]> = {
  GENERAL: ["LISTENING", "READING", "WRITING", "SPEAKING"],
  LS: ["LISTENING", "SPEAKING"],
};

export const VERSION_LABEL: Record<CelpipVersion, string> = {
  GENERAL: "CELPIP-General (all 4 skills · PR)",
  LS: "CELPIP-General LS (Listening + Speaking · citizenship)",
};

/** A sub-test only appears in LS if it's Listening or Speaking. */
export function subTestInVersion(subTest: CelpipSubTest, version: CelpipVersion): boolean {
  return VERSION_SUBTESTS[version].includes(subTest);
}

// ---- Per-task payload (stimulus + answer key) and response shapes ----
// payload lives on CelpipItem.payload; response on CelpipAttempt.response. Answer
// keys inside payloads are stripped server-side before reaching the client.

export type Speaker = { role: string; voice: string };
export type McqOption = { id: string; text: string };
export type McqQuestion = {
  id: string;
  stem: string;
  options: McqOption[];
  answer: string; // option id — stripped before client send
};

// LISTENING (all 6 parts) — audio + multiple choice.
export type ListeningPayload = {
  audioScript: string;
  speakers: Speaker[];
  questions: McqQuestion[];
};

// READING (all 4 parts) — passages/correspondence + MCQ (+ matching for diagram).
export type ReadingText = { id: string; heading?: string; body: string };
export type ReadingQuestion = {
  id: string;
  kind: "mcq" | "match";
  stem: string;
  options?: McqOption[];
  answer: string;
};
export type ReadingPayload = {
  passages: ReadingText[];
  questions: ReadingQuestion[];
};

// WRITING — Email (respond to a situation) and Survey (choose + justify).
export type WritingEmailPayload = {
  situation: string;
  instruction: string;
  wordMin: number; // CELPIP Email: ~150-200
  wordMax: number;
};
export type WritingSurveyPayload = {
  topic: string;
  optionA: string;
  optionB: string;
  instruction: string;
  wordMin: number; // CELPIP Survey: ~150-200
  wordMax: number;
};
export type WritingResponse = { text: string };

// SPEAKING — 8 tasks. Some show an image (describe scene / unusual situation).
export type SpeakingPayload = {
  taskPrompt: string;
  prepSeconds: number;
  speakSeconds: number;
  imageUrl?: string;
  imageAlt?: string;
};
export type SpeakingResponse = { transcript: string };

// Objective (Listening/Reading) response.
export type ObjectiveResponse = { answers: Record<string, string | string[]> };
