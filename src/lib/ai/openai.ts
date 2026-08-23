// OpenAI helpers via fetch (no SDK dependency): Whisper transcription for Speak
// About the Photo, which records its cost to the AICostLedger.
//
// The TTS synthesisers that used to live here (synthesizeSpeech,
// synthesizeDialogue, concatBuffers) were removed with
// /api/celpip/audio/[attemptId] once every active Listening item had a
// pre-rendered clip. Listening audio is now rendered ONCE, offline and free,
// by scripts/render-listening-audio.ts; no learner request reaches a paid
// synthesiser. There is no runtime fallback any more — see that script's header.

import { computeTranscriptionCostCents } from "@/lib/ai/cost";
import { recordTranscriptionCost } from "@/lib/ai/anthropic-client";

const OPENAI_BASE = "https://api.openai.com/v1";

function getKey(): string {
  const k = process.env.OPENAI_API_KEY;
  if (!k || k.length < 20 || k === "TODO_FOUNDER_PROVIDES") {
    throw new Error("OPENAI_API_KEY missing or invalid — set a real key in Vercel env");
  }
  return k;
}

/** Transcribe a recorded audio clip with Whisper. */
export async function transcribeAudio(args: {
  file: Blob;
  filename: string;
  durationSeconds: number;
  userId: string | null;
}): Promise<string> {
  const form = new FormData();
  form.append("file", args.file, args.filename);
  form.append("model", "whisper-1");

  let res: Response;
  try {
    res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getKey()}` },
      body: form,
    });
  } catch (err) {
    await recordTranscriptionCost({
      userId: args.userId,
      feature: "speak-about-photo.transcribe",
      model: "whisper-1",
      durationSeconds: args.durationSeconds,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
  if (!res.ok) {
    await recordTranscriptionCost({
      userId: args.userId,
      feature: "speak-about-photo.transcribe",
      model: "whisper-1",
      durationSeconds: args.durationSeconds,
      success: false,
      errorMessage: `Whisper HTTP ${res.status}`,
    });
    throw new Error(`Transcription request failed: ${res.status}`);
  }
  await recordTranscriptionCost({
    userId: args.userId,
    feature: "speak-about-photo.transcribe",
    model: "whisper-1",
    durationSeconds: args.durationSeconds,
    success: true,
  });
  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}

// computeTranscriptionCostCents is re-exported for callers that need the raw
// figure without recording (none yet, but keeps the cost module discoverable).
export { computeTranscriptionCostCents };
