import {
  PRICING_USD_PER_MTOK,
  TRANSCRIPTION_USD_PER_MINUTE,
  type ModelId,
  type TranscriptionModelId,
} from "@/lib/ai/models";

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
};

/**
 * Compute the dollar cost of an Anthropic call. Result is in 1/100 cents
 * (i.e. an integer where 1 = $0.0001 = 100 micro-dollars) so we can store
 * tiny costs exactly as ints in Postgres without Decimal overhead.
 *
 * Cache-write tokens are billed at the 5-minute-TTL rate (1.25x input). If
 * we ever pass `ttl: "1h"` we'll need a `cacheWrite1h` rate; not used yet.
 */
export function computeCostCents(model: ModelId, usage: Usage): number {
  const rates = PRICING_USD_PER_MTOK[model];
  if (!rates) {
    throw new Error(`No pricing for model ${model}`);
  }
  const dollars =
    (usage.inputTokens / 1_000_000) * rates.input +
    (usage.outputTokens / 1_000_000) * rates.output +
    ((usage.cacheReadTokens ?? 0) / 1_000_000) * rates.cacheRead +
    ((usage.cacheWriteTokens ?? 0) / 1_000_000) * rates.cacheWrite5m;
  // 1 hundredth-of-a-cent = $0.0001 = dollars * 10_000
  return Math.round(dollars * 10_000);
}

/**
 * Cost of a Whisper transcription, in the same 1/100-cents unit as
 * computeCostCents. Whisper bills per minute (per-second granularity), so we
 * convert the clip's duration in seconds to minutes and multiply by the rate.
 */
export function computeTranscriptionCostCents(
  model: TranscriptionModelId,
  durationSeconds: number,
): number {
  const ratePerMin = TRANSCRIPTION_USD_PER_MINUTE[model];
  if (ratePerMin === undefined) {
    throw new Error(`No transcription pricing for model ${model}`);
  }
  const dollars = (Math.max(0, durationSeconds) / 60) * ratePerMin;
  return Math.round(dollars * 10_000);
}

export function formatCents(centHundredths: number): string {
  const cents = centHundredths / 100;
  if (cents < 1) {
    return `${centHundredths / 100}¢`;
  }
  return `$${(cents / 100).toFixed(4)}`;
}
