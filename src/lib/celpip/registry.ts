// The data-driven task registry — the single place that knows about CELPIP task
// types. Pages, the practice hub, the mock plan and the submit route read from
// here; nothing branches on task type with a hand-written if-chain.

import type { CelpipSubTest, CelpipTaskType, CelpipVersion } from "@prisma/client";
import { listeningPayloadSchema, scoreListening } from "@/lib/celpip/tasks/listening";
import { readingPayloadSchema, scoreReading } from "@/lib/celpip/tasks/reading";
import { objectiveResponseSchema } from "@/lib/celpip/tasks/objective";
import {
  writingEmailPayloadSchema,
  writingSurveyPayloadSchema,
  writingResponseSchema,
  evaluateWriting,
} from "@/lib/celpip/tasks/writing";
import {
  speakingPayloadSchema,
  speakingResponseSchema,
  evaluateSpeaking,
} from "@/lib/celpip/tasks/speaking";

export type ScoringMode = "DETERMINISTIC" | "AI";

export type TaskDef = {
  taskType: CelpipTaskType;
  subTest: CelpipSubTest;
  slug: string;
  label: string;
  scoringMode: ScoringMode;
  live: boolean;
  blurb: string;
};

// Listening + Reading are fully wired (seed content, composer, deterministic
// scoring, audio TTS) and ship live in Phase 0. Writing + Speaking are structurally
// complete but their AI graders land in Phase 2/3, so they stay live:false (shown
// as "Coming soon") until then — we never advertise a task we can't yet grade.
const L = (taskType: CelpipTaskType, slug: string, label: string, blurb: string): TaskDef => ({
  taskType, subTest: "LISTENING", slug, label, scoringMode: "DETERMINISTIC", live: true, blurb,
});
const R = (taskType: CelpipTaskType, slug: string, label: string, blurb: string): TaskDef => ({
  taskType, subTest: "READING", slug, label, scoringMode: "DETERMINISTIC", live: true, blurb,
});
const W = (taskType: CelpipTaskType, slug: string, label: string, blurb: string): TaskDef => ({
  taskType, subTest: "WRITING", slug, label, scoringMode: "AI", live: false, blurb,
});
const S = (taskType: CelpipTaskType, slug: string, label: string, blurb: string): TaskDef => ({
  taskType, subTest: "SPEAKING", slug, label, scoringMode: "AI", live: false, blurb,
});

export const CELPIP_TASKS: Record<CelpipTaskType, TaskDef> = {
  LISTENING_PROBLEM_SOLVING: L("LISTENING_PROBLEM_SOLVING", "listening-problem-solving", "Listening — Problem Solving", "Listen to a problem-solving conversation and answer multiple-choice questions. Audio plays once."),
  LISTENING_DAILY_LIFE: L("LISTENING_DAILY_LIFE", "listening-daily-life", "Listening — Daily Life", "A daily-life conversation, multiple choice. Audio plays once."),
  LISTENING_INFORMATION: L("LISTENING_INFORMATION", "listening-information", "Listening — Information", "Listen for information, then answer multiple choice."),
  LISTENING_NEWS: L("LISTENING_NEWS", "listening-news", "Listening — News Item", "A short news item, multiple choice."),
  LISTENING_DISCUSSION: L("LISTENING_DISCUSSION", "listening-discussion", "Listening — Discussion", "A discussion between speakers, multiple choice."),
  LISTENING_VIEWPOINTS: L("LISTENING_VIEWPOINTS", "listening-viewpoints", "Listening — Viewpoints", "A longer talk presenting viewpoints, multiple choice."),
  READING_CORRESPONDENCE: R("READING_CORRESPONDENCE", "reading-correspondence", "Reading — Correspondence", "Read a letter or email and answer multiple-choice questions."),
  READING_DIAGRAM: R("READING_DIAGRAM", "reading-diagram", "Reading — Diagram", "Read a diagram or application and match the information."),
  READING_INFORMATION: R("READING_INFORMATION", "reading-information", "Reading — Information", "Read an information passage, multiple choice."),
  READING_VIEWPOINTS: R("READING_VIEWPOINTS", "reading-viewpoints", "Reading — Viewpoints", "Read a text with opinions and answer on meaning and viewpoint."),
  WRITING_EMAIL: W("WRITING_EMAIL", "writing-email", "Writing — Email", "Write an email responding to a situation (150–200 words). Honest feedback against the four CELPIP writing criteria."),
  WRITING_SURVEY: W("WRITING_SURVEY", "writing-survey", "Writing — Survey Response", "Choose an option and justify it (150–200 words). Honest feedback against the four CELPIP writing criteria."),
  SPEAKING_ADVICE: S("SPEAKING_ADVICE", "speaking-advice", "Speaking — Giving Advice", "Give advice in a short spoken response. Graded on the four CELPIP speaking criteria — never accent."),
  SPEAKING_PERSONAL_EXPERIENCE: S("SPEAKING_PERSONAL_EXPERIENCE", "speaking-personal-experience", "Speaking — Personal Experience", "Talk about a personal experience."),
  SPEAKING_DESCRIBE_SCENE: S("SPEAKING_DESCRIBE_SCENE", "speaking-describe-scene", "Speaking — Describe a Scene", "Describe what you see in an image."),
  SPEAKING_PREDICTIONS: S("SPEAKING_PREDICTIONS", "speaking-predictions", "Speaking — Making Predictions", "Predict what might happen next in a scene."),
  SPEAKING_COMPARE_PERSUADE: S("SPEAKING_COMPARE_PERSUADE", "speaking-compare-persuade", "Speaking — Compare & Persuade", "Compare two options and persuade someone of your choice."),
  SPEAKING_DIFFICULT_SITUATION: S("SPEAKING_DIFFICULT_SITUATION", "speaking-difficult-situation", "Speaking — Difficult Situation", "Deal with a difficult situation by choosing and explaining an option."),
  SPEAKING_OPINIONS: S("SPEAKING_OPINIONS", "speaking-opinions", "Speaking — Expressing Opinions", "Express and support your opinion on a topic."),
  SPEAKING_UNUSUAL_SITUATION: S("SPEAKING_UNUSUAL_SITUATION", "speaking-unusual-situation", "Speaking — Unusual Situation", "Describe an unusual situation in an image to someone who cannot see it."),
};

export function taskBySlug(slug: string): TaskDef | undefined {
  return Object.values(CELPIP_TASKS).find((t) => t.slug === slug);
}
export function tasksForSubTest(subTest: CelpipSubTest): TaskDef[] {
  return Object.values(CELPIP_TASKS).filter((t) => t.subTest === subTest);
}

// The full mock sequence per version: one item per LIVE task type, in test order.
// We include only live tasks so the mock never lands on a task we can't yet grade;
// as Writing/Speaking go live in Phase 2/3 they join the mock automatically.
const ORDER: CelpipSubTest[] = ["LISTENING", "READING", "WRITING", "SPEAKING"];
export function mockPlan(version: CelpipVersion): CelpipTaskType[] {
  const subtests = version === "LS" ? (["LISTENING", "SPEAKING"] as CelpipSubTest[]) : ORDER;
  const plan: CelpipTaskType[] = [];
  for (const st of subtests) for (const t of tasksForSubTest(st)) if (t.live) plan.push(t.taskType);
  return plan;
}

// ---- Server scoring dispatch ----

export type TaskRunResult = {
  pointsEarned: number;
  pointsMax: number;
  fraction: number;
  detail?: unknown;
  feedback?: unknown;
  telemetry?: { aiModel: string; costCents: number; latencyMs: number };
};

export type TaskHandler = {
  mode: ScoringMode;
  run: (input: { payload: unknown; response: unknown; userId: string }) => Promise<TaskRunResult>;
};

const listeningHandler: TaskHandler = {
  mode: "DETERMINISTIC",
  run: async ({ payload, response }) =>
    scoreListening(listeningPayloadSchema.parse(payload), objectiveResponseSchema.parse(response)),
};
const readingHandler: TaskHandler = {
  mode: "DETERMINISTIC",
  run: async ({ payload, response }) =>
    scoreReading(readingPayloadSchema.parse(payload), objectiveResponseSchema.parse(response)),
};
const writingHandler = (taskType: "WRITING_EMAIL" | "WRITING_SURVEY"): TaskHandler => ({
  mode: "AI",
  run: async ({ payload, response, userId }) => {
    const schema = taskType === "WRITING_EMAIL" ? writingEmailPayloadSchema : writingSurveyPayloadSchema;
    const p = schema.parse(payload);
    const r = writingResponseSchema.parse(response);
    const s = await evaluateWriting({ taskType, payload: p, response: r, userId });
    return { pointsEarned: s.pointsEarned, pointsMax: s.pointsMax, fraction: s.fraction, feedback: s.feedback, telemetry: s.telemetry };
  },
});
const speakingHandler: TaskHandler = {
  mode: "AI",
  run: async ({ payload, response, userId }) => {
    const p = speakingPayloadSchema.parse(payload);
    const r = speakingResponseSchema.parse(response);
    const s = await evaluateSpeaking({ payload: p, response: r, userId });
    return { pointsEarned: s.pointsEarned, pointsMax: s.pointsMax, fraction: s.fraction, feedback: s.feedback, telemetry: s.telemetry };
  },
};

export const CELPIP_HANDLERS: Record<CelpipTaskType, TaskHandler> = {
  LISTENING_PROBLEM_SOLVING: listeningHandler,
  LISTENING_DAILY_LIFE: listeningHandler,
  LISTENING_INFORMATION: listeningHandler,
  LISTENING_NEWS: listeningHandler,
  LISTENING_DISCUSSION: listeningHandler,
  LISTENING_VIEWPOINTS: listeningHandler,
  READING_CORRESPONDENCE: readingHandler,
  READING_DIAGRAM: readingHandler,
  READING_INFORMATION: readingHandler,
  READING_VIEWPOINTS: readingHandler,
  WRITING_EMAIL: writingHandler("WRITING_EMAIL"),
  WRITING_SURVEY: writingHandler("WRITING_SURVEY"),
  SPEAKING_ADVICE: speakingHandler,
  SPEAKING_PERSONAL_EXPERIENCE: speakingHandler,
  SPEAKING_DESCRIBE_SCENE: speakingHandler,
  SPEAKING_PREDICTIONS: speakingHandler,
  SPEAKING_COMPARE_PERSUADE: speakingHandler,
  SPEAKING_DIFFICULT_SITUATION: speakingHandler,
  SPEAKING_OPINIONS: speakingHandler,
  SPEAKING_UNUSUAL_SITUATION: speakingHandler,
};
