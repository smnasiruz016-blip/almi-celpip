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
export function sanitizePayload(taskType: CelpipTaskType, payload: unknown): unknown {
  const p = (payload ?? {}) as Record<string, unknown>;
  if (taskType.startsWith("LISTENING")) {
    const questions = (p.questions as { id: string; stem: string; options: unknown[] }[] | undefined) ?? [];
    // audioScript + answer stay server-side.
    return { questions: questions.map((q) => ({ id: q.id, stem: q.stem, options: q.options })) };
  }
  if (taskType.startsWith("READING")) {
    const questions = (p.questions as { id: string; stem: string; options?: unknown[] }[] | undefined) ?? [];
    return {
      passages: p.passages,
      questions: questions.map((q) => ({ id: q.id, stem: q.stem, options: q.options })),
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
