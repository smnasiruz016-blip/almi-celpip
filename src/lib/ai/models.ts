// Centralized Anthropic model registry. Mirrors AlmiCV's pattern so the
// family stays on one source of truth when models change.
//
// Verified current 2026-05-29 against Anthropic docs.

export const MODELS = {
  // Day 3 default for writing evaluation, Day 4 for speaking evaluation +
  // the dual-persona engine. Best quality/cost balance for structured-output
  // graders and in-character conversation.
  SONNET: "claude-sonnet-4-6",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

// --- Transcription (OpenAI Whisper) ---
// Whisper bills per minute of audio, not per token. Kept separate from the
// token-based Anthropic pricing above. Source: OpenAI pricing — whisper-1 is
// $0.006 / minute (billed per second, rounded up to the nearest second).
export const TRANSCRIPTION_MODELS = {
  WHISPER: "whisper-1",
} as const;

export type TranscriptionModelId =
  (typeof TRANSCRIPTION_MODELS)[keyof typeof TRANSCRIPTION_MODELS];

export const TRANSCRIPTION_USD_PER_MINUTE: Record<TranscriptionModelId, number> = {
  "whisper-1": 0.006,
};

// --- Text-to-speech (OpenAI) — Listen and Type prompt audio, generated on
// demand so the sentence text never reaches the client. tts-1 is $15 / 1M chars.
export const TTS_MODELS = {
  TTS: "tts-1",
} as const;

export type TtsModelId = (typeof TTS_MODELS)[keyof typeof TTS_MODELS];

export const TTS_USD_PER_1K_CHARS: Record<TtsModelId, number> = {
  "tts-1": 0.015,
};

// Per-million-token pricing in dollars. Source: Anthropic pricing page.
// Cache read = 10% of input. Cache write 5-min TTL = 1.25x of input.
export const PRICING_USD_PER_MTOK: Record<
  ModelId,
  { input: number; output: number; cacheRead: number; cacheWrite5m: number }
> = {
  "claude-sonnet-4-6": {
    input: 3.0,
    output: 15.0,
    cacheRead: 0.3,
    cacheWrite5m: 3.75,
  },
};
