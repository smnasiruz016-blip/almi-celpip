/**
 * RR-399 A3 · THE "1 FREE" IS ATOMIC. Two requests at the same moment could both pass a count ("0 used") and both get the free AI
 * scoring. Now the free use is RESERVED before the AI call, in one INSERT that the database's unique key (userId, kind) lets only
 * one request win. If the AI call then fails, the reservation is released, so the learner can try again.
 *
 * Safe before the owner runs the migration: if the FreeAiUse table is not there yet, claimFreeAi() answers "UNAVAILABLE" and the
 * caller keeps the previous (count-based) decision, so nothing breaks; once the table exists the race is closed.
 * Paying users never reach this code.
 */
import { prisma } from "@/lib/prisma";

export type FreeAiKind = "WRITING" | "SPEAKING";
export type ClaimResult = "RESERVED" | "USED" | "UNAVAILABLE";

/** the smallest store this needs (the real one is prisma; tests pass a fake with the same unique rule) */
export type ClaimStore = {
  freeAiUse: {
    create(args: { data: { userId: string; kind: string } }): Promise<unknown>;
    deleteMany(args: { where: { userId: string; kind: string } }): Promise<unknown>;
  };
};

const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === "P2002";

export async function claimFreeAi(userId: string, kind: FreeAiKind, store: ClaimStore = prisma as unknown as ClaimStore): Promise<ClaimResult> {
  try {
    await store.freeAiUse.create({ data: { userId, kind } });
    return "RESERVED";
  } catch (e) {
    if (isUniqueViolation(e)) return "USED";
    return "UNAVAILABLE"; // the table is not migrated yet, or the database is unreachable: the caller keeps its count-based decision
  }
}

/** give the free use back when the AI call failed (the learner received nothing) */
export async function releaseFreeAi(userId: string, kind: FreeAiKind, store: ClaimStore = prisma as unknown as ClaimStore): Promise<void> {
  try { await store.freeAiUse.deleteMany({ where: { userId, kind } }); } catch { /* nothing to give back */ }
}
