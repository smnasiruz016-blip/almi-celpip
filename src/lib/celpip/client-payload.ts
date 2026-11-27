// THE SERVER → CLIENT BOUNDARY FOR AN IN-PROGRESS ATTEMPT.
//
// AlmiWorld Constitution §5: grading is server-authoritative and the answer key
// never appears in a served payload. For Listening the stake is higher than the
// `answer` fields, because the item's `audioScript` IS the transcript and the
// transcript contains the answers. /api/celpip/audio/[attemptId] exists precisely
// so the script never reaches the browser.
//
// Everything a client composer receives is built HERE, by one function, so the
// boundary is one object that a test can stringify and search. Two rules keep it
// honest, and both are load-bearing:
//
//   1. sanitizePayload is an ALLOWLIST. It never spreads the stored payload; it
//      constructs a new object naming the fields that may cross. audioScript and
//      answer are excluded by never being mentioned, so a new secret added to a
//      payload shape is excluded on the day it is added, not the day someone
//      remembers to deny it.
//
//   2. audioUrl rides as its own scalar, NOT as a field folded into the payload
//      object. It is a separate column on CelpipItem (String?), while audioScript
//      is a key inside the payload Json column. Reading one cannot read the other,
//      and `string | null` has no room to carry a neighbour.

import type { CelpipTaskType } from "@prisma/client";

/** Exactly the fields that cross to a client composer. Nothing else does. */
export type ComposerClientProps = {
  attemptId: string;
  taskType: CelpipTaskType;
  prompt: string;
  payload: unknown;
  audioUrl: string | null;
};

// Strip any server-only answer key before sending the payload to the client.
// Objective items (Listening, Reading) keep their questions but lose the `answer`
// field; Listening audio scripts never go to the client. Writing/Speaking payloads
// carry no objective answer key.
// RR-418 · still an allowlist. New fields that may cross: a question's kind, blank number, passage, section; a passage's kind; Listening
// Part 1's sections (label + clip URL), the Part 5 video note and the full-test position. The explanation ("Why") is like the key: it is
// shown only after submit, from the server-rendered review, and never crosses here.
type Q = { id: string; stem: string; options?: unknown[]; kind?: unknown; blank?: unknown; passage?: unknown; section?: unknown };
const pick = (q: Q) => ({
  id: q.id, stem: q.stem, options: q.options,
  ...(typeof q.kind === "string" ? { kind: q.kind } : {}),
  ...(typeof q.blank === "number" ? { blank: q.blank } : {}),
  ...(typeof q.passage === "string" ? { passage: q.passage } : {}),
  ...(typeof q.section === "string" ? { section: q.section } : {}),
});
const fullTestOf = (p: Record<string, unknown>) => {
  const f = p.fullTest as { test?: unknown; part?: unknown; parts?: unknown; title?: unknown } | undefined;
  return f && typeof f.test === "string" ? { fullTest: { test: f.test, part: Number(f.part), parts: Number(f.parts), title: String(f.title ?? "") } } : {};
};

export function sanitizePayload(taskType: CelpipTaskType, payload: unknown): unknown {
  const p = (payload ?? {}) as Record<string, unknown>;
  if (taskType.startsWith("LISTENING")) {
    const questions = (p.questions as Q[] | undefined) ?? [];
    const sections = (p.sections as { id: string; label: string; audioUrl: string; audioDurationSec?: number | null }[] | undefined) ?? null;
    // audioScript + answer + explanation stay server-side.
    return {
      questions: questions.map(pick),
      ...(sections ? { sections: sections.map((s) => ({ id: s.id, label: s.label, audioUrl: s.audioUrl, audioDurationSec: s.audioDurationSec ?? null })) } : {}),
      ...(typeof p.note === "string" ? { note: p.note } : {}),
      ...fullTestOf(p),
    };
  }
  if (taskType.startsWith("READING")) {
    const questions = (p.questions as Q[] | undefined) ?? [];
    const passages = (p.passages as { id: string; heading?: string; body: string; kind?: string }[] | undefined) ?? [];
    return {
      passages: passages.map((t) => ({ id: t.id, body: t.body, ...(t.heading ? { heading: t.heading } : {}), ...(t.kind ? { kind: t.kind } : {}) })),
      questions: questions.map(pick),
      ...fullTestOf(p),
    };
  }
  // Writing (Email/Survey) and Speaking carry no objective answer key.
  return payload;
}

/**
 * Build the complete prop object for a client composer.
 * `audioUrl` is normalised to null when absent or blank, so the client has exactly
 * one shape to branch on.
 */
export function buildComposerProps(item: {
  attemptId: string;
  taskType: CelpipTaskType;
  prompt: string;
  payload: unknown;
  audioUrl: string | null;
}): ComposerClientProps {
  const stored = typeof item.audioUrl === "string" ? item.audioUrl.trim() : "";
  return {
    attemptId: item.attemptId,
    taskType: item.taskType,
    prompt: item.prompt,
    payload: sanitizePayload(item.taskType, item.payload),
    audioUrl: stored.length > 0 ? stored : null,
  };
}
