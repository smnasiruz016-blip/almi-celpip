// Splitting a Listening audioScript into per-speaker segments.
//
// Lifted out of src/lib/ai/openai.ts UNCHANGED so that exactly one implementation
// exists. The pre-render script and the runtime must agree about where the speaker
// boundaries are; two copies of this function would drift, and the drift would only
// show up as a stored clip that sounds different from the one the runtime produced.
//
// Pure: no vendor, no network, no cost.

export type DialogueSpeaker = { role: string; voice: string };

/** Split a script into consecutive [voice, text] runs, one per "Role:" boundary.
 *  Speaker labels are removed from the spoken text — the voice change signals who
 *  is talking, as in the real exam. Returns [] when the script cannot be split,
 *  which the callers treat as "read the whole thing in one voice". */
export function splitDialogue(
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

// ── Voice map: the bank's OpenAI voice names -> free edge-tts neural voices ──
//
// The bank stores OpenAI voice ids (nova/alloy/echo/shimmer/onyx/fable) inside each
// item's payload. Rather than rewrite 48 payloads, the renderer translates. CELPIP is
// a Canadian test, so the two en-CA voices are used first and en-US/en-GB fill the
// rest — a 3-speaker dialogue needs three distinguishable voices and en-CA has two.
//
// Genders are preserved from the OpenAI voices so an item whose script says "Woman:"
// still sounds like one.
export const EDGE_VOICE: Record<string, string> = {
  nova: "en-CA-ClaraNeural",       // female
  shimmer: "en-US-AriaNeural",     // female
  alloy: "en-CA-LiamNeural",       // male
  echo: "en-US-GuyNeural",         // male
  onyx: "en-US-ChristopherNeural", // male, deeper
  fable: "en-GB-RyanNeural",       // male, British
};

export const FALLBACK_EDGE_VOICE = "en-CA-ClaraNeural";

/** Every OpenAI voice present in the bank must have a mapping, or a speaker silently
 *  collapses onto the fallback and two characters end up sounding identical. */
export function edgeVoiceFor(openAiVoice: string): string | null {
  return EDGE_VOICE[openAiVoice] ?? null;
}
