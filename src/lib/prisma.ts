import { PrismaClient } from "@prisma/client";

// Singleton pattern for Next.js dev — prevents the "too many connections"
// error when hot-reloading. In production each lambda gets its own client.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Run a database read, retrying ONCE on a connection-class failure.
 *
 * WHY. AlmiMonitor flagged a sibling product's /api/status as HTTP 500 while the app
 * was entirely healthy: homepage 200, every page 200, the same endpoint 200 on 8/8
 * subsequent probes, item count exactly at baseline, last deploy 8 days earlier, and
 * $0.31 of function invocations across a 28-day cycle. What is left is a single
 * transient failure — these are low-traffic products on Neon, whose compute
 * autosuspends, and the first query against a resuming compute can fail outright.
 * Nothing retried, so one unlucky request became one 500, and one 500 became a red
 * line in the weekly health mail. A health endpoint that reports DOWN because the
 * database was asleep is reporting on the wrong thing, and it teaches people to skim
 * past the weekly mail — which is how a real outage gets missed.
 *
 * ONLY connection-class errors are retried. A P2002 or a malformed query is
 * deterministic: retrying it fails twice, doubles the latency and hides a real bug.
 * One retry, not a loop — a second failure against a woken compute is a real fault.
 *
 * ⚠️ TEMPORARY COPY. The canonical home is withDbRetry() in
 * @smnasiruz016-blip/almi-data v0.7.0 (committed a1429f8). It is NOT published: the
 * GitHub Packages token is dead (npm publish → 401 "User cannot be authenticated with
 * the token provided") and minting one is a founder action. Replace this block with
 * the package import once 0.7.0 is on the registry — a local copy freezes on fork day
 * exactly like the family list did.
 *
 * Only three products needed this. Verified 2026-07-28 across all fourteen: the rest
 * either count items from bundles or treat the DB as best-effort with ok:true, so a DB
 * failure cannot 500 their health check.
 */
const RETRYABLE_DB_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);

function isRetryableDbError(e: unknown): boolean {
  const code = (e as { code?: unknown })?.code;
  if (typeof code === "string" && RETRYABLE_DB_CODES.has(code)) return true;
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /can't reach database server|connection closed|connection reset|server has closed the connection|timed out fetching a new connection|ECONNRESET|ETIMEDOUT/i.test(msg);
}

export async function withDbRetry<T>(op: () => Promise<T>, backoffMs = 300): Promise<T> {
  try {
    return await op();
  } catch (e) {
    if (!isRetryableDbError(e)) throw e;
    await new Promise((r) => setTimeout(r, backoffMs));
    return await op();
  }
}
