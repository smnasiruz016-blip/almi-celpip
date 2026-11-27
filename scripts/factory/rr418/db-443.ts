// RR-418 · the ONLY way the owner's write reaches the database (the RR-416 pattern, proven): Neon over WebSockets on port 443 (the Neon
// serverless driver + Prisma's Neon adapter). Port 5432 to Neon does not work on the owner's network, and the owner is never asked to
// change network, IPv6, firewall or admin settings. The URL is used exactly as pasted (no query parameters are added).
//   - every interactive transaction uses TX_LIMITS (timeout 300 s, maxWait 30 s);
//   - a write needs RR418_CONFIRM exactly "YES" (capital letters; "yes" is refused).
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

export const TX_LIMITS = { timeout: 300_000, maxWait: 30_000 } as const;

export function neonUrl(raw: string | undefined): string {
  if (!raw) throw new Error("DATABASE_URL is not set");
  const s = raw.trim();
  const u = new URL(s);
  if (!/^postgres(ql)?:$/.test(u.protocol)) throw new Error("DATABASE_URL is not a postgres URL");
  if (!/\.neon\.tech$/.test(u.hostname)) throw new Error("DATABASE_URL is not a Neon host; this script only talks to Neon over port 443");
  return s;
}

export function prisma443(raw = process.env.DATABASE_URL, ws: unknown = (globalThis as { WebSocket?: unknown }).WebSocket): PrismaClient {
  if (!ws) throw new Error("this Node has no WebSocket (Node 22 or newer is needed)");
  neonConfig.webSocketConstructor = ws as typeof WebSocket;
  neonConfig.useSecureWebSocket = true; // wss:// → port 443
  neonConfig.wsProxy = (host: string) => `${host}/v2`; // Neon's WebSocket endpoint on the database host, port 443
  neonConfig.pipelineConnect = false;
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString: neonUrl(raw), connectionTimeoutMillis: 60_000 }) });
}

export function confirmed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.RR418_CONFIRM === "YES";
}
