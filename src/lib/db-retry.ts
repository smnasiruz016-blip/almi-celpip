import { Prisma } from "@prisma/client";

const DEFAULT_DELAYS_MS = [200, 800, 2400];
const DEFAULT_MAX_ATTEMPTS = 4;

interface RetryOpts {
  maxAttempts?: number;
  delaysMs?: number[];
}

function isRetryable(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code === "P1001" || err.code === "P1002";
  }
  return false;
}

function delayFor(attempt: number, delays: number[]): number {
  const idx = attempt - 2;
  if (idx < 0) return 0;
  if (idx < delays.length) return delays[idx];
  return delays[delays.length - 1];
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOpts = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const delays = opts.delaysMs ?? DEFAULT_DELAYS_MS;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryable(err) || attempt === maxAttempts) throw err;
      const delay = delayFor(attempt + 1, delays);
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[db-retry] attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms: ${msg}`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("withDbRetry: unreachable");
}
