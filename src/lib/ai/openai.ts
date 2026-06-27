// OpenAI helpers via fetch (no SDK dependency): on-demand TTS for Listen and
// Type prompt audio, and Whisper transcription for Speak About the Photo. Both
// record cost to the AICostLedger.

import { TTS_USD_PER_1K_CHARS } from "@/lib/ai/models";
import { computeTranscriptionCostCents } from "@/lib/ai/cost";
import { recordExternalCost, recordTranscriptionCost } from "@/lib/ai/anthropic-client";

const OPENAI_BASE = "https://api.openai.com/v1";

function getKey(): string {
  const k = process.env.OPENAI_API_KEY;
  if (!k || k.length < 20 || k === "TODO_FOUNDER_PROVIDES") {
    throw new Error("OPENAI_API_KEY missing or invalid — set a real key in Vercel env");
  }
  return k;
}

/** Generate spoken audio (mp3) from text with a chosen voice. Kept server-side
 *  so the Listening transcript (which carries the answers) never reaches the
 *  client. */
export async function synthesizeSpeech(
  text: string,
  userId: string | null,
  voice: string = "alloy",
): Promise<ArrayBuffer> {
  let res: Response;
  try {
    res = await fetch(`${OPENAI_BASE}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice,
        input: text,
        response_format: "mp3",
      }),
    });
  } catch (err) {
    await recordExternalCost({
      userId,
      feature: "listening.tts",
      model: "tts-1",
      costCents: 0,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
  if (!res.ok) {
    await recordExternalCost({
      userId,
      feature: "listening.tts",
      model: "tts-1",
      costCents: 0,
      success: false,
      errorMessage: `TTS HTTP ${res.status}`,
    });
    throw new Error(`TTS request failed: ${res.status}`);
  }
  const costCents = Math.round((text.length / 1000) * TTS_USD_PER_1K_CHARS["tts-1"] * 10_000);
  await recordExternalCost({
    userId,
    feature: "listening.tts",
    model: "tts-1",
    costCents,
    success: true,
  });
  return res.arrayBuffer();
}

type DialogueSpeaker = { role: string; voice: string };

/** Split a labelled script ("Clinician: … Patient: …") into ordered segments,
 *  each tagged with the speaker's voice. Speaker labels are removed from the
 *  spoken text — the voice change signals who is talking, as in the real exam. */
function splitDialogue(
  script: string,
  speakers: DialogueSpeaker[],
): { voice: string; text: string }[] {
  if (speakers.length < 2) return [];
  const roleToVoice = new Map(speakers.map((s) => [s.role.toLowerCase(), s.voice]));
  const labels = speakers.map((s) => s.role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // Find every "Role:" boundary, then slice the text between consecutive marks.
  const re = new RegExp(`(${labels.join("|")})\\s*:\\s*`, "gi");
  const marks: { role: string; at: number; end: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(script)) !== null) {
    marks.push({ role: match[1], at: match.index, end: match.index + match[0].length });
  }
  if (marks.length < 2) return [];
  const segments: { voice: string; text: string }[] = [];
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    const textEnd = i + 1 < marks.length ? marks[i + 1].at : script.length;
    const text = script.slice(m.end, textEnd).trim();
    const voice = roleToVoice.get(m.role.toLowerCase()) ?? speakers[0].voice;
    if (text) segments.push({ voice, text });
  }
  return segments;
}

/** Concatenate several tts-1 MP3 buffers into one. tts-1 returns constant-
 *  bitrate MP3, which browsers play back fine when frames are concatenated. */
function concatBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((n, b) => n + b.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of buffers) {
    out.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  }
  return out.buffer;
}

/** Generate two-speaker consultation audio (Listening Part A) by synthesising
 *  each line in its speaker's voice and concatenating. Falls back to a single
 *  voice for the whole script if the dialogue can't be split. */
export async function synthesizeDialogue(
  script: string,
  speakers: DialogueSpeaker[],
  userId: string | null,
): Promise<ArrayBuffer> {
  const segments = splitDialogue(script, speakers);
  if (segments.length < 2) return synthesizeSpeech(script, userId, speakers[0]?.voice);
  const buffers: ArrayBuffer[] = [];
  for (const seg of segments) {
    buffers.push(await synthesizeSpeech(seg.text, userId, seg.voice));
  }
  return concatBuffers(buffers);
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
