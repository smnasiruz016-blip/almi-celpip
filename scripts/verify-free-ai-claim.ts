// RR-399 A3 · the free AI use is atomic: of two requests at the same moment only ONE wins; a failed AI call gives it back; before the
// migration (no table) the caller keeps its old decision. Pure: a fake store with the database's unique rule; no DB, no AI.
// Run: npx tsx scripts/verify-free-ai-claim.ts
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const FILE = ["src/lib/billing/free-ai-claim.ts", "src/lib/free-ai-claim.ts"].find((p) => existsSync(join(ROOT, p)))!;
let failed = 0;
const t = async (name: string, fn: () => Promise<unknown>) => { try { await fn(); console.log(`  PASS ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message.split("\n")[0]}`); } };

/* the database's rule: (userId, kind) is unique; a second insert fails with Prisma's P2002 */
function uniqueStore() {
  const rows = new Set<string>();
  return {
    rows,
    freeAiUse: {
      async create({ data }: { data: { userId: string; kind: string } }) {
        await new Promise((r) => setTimeout(r, Math.random() * 5)); // two requests interleave
        const k = `${data.userId}|${data.kind}`;
        if (rows.has(k)) throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        rows.add(k);
        return data;
      },
      async deleteMany({ where }: { where: { userId: string; kind: string } }) { rows.delete(`${where.userId}|${where.kind}`); return { count: 1 }; },
    },
  };
}
const missingTable = { freeAiUse: { async create() { throw Object.assign(new Error('relation "FreeAiUse" does not exist'), { code: "P2021" }); }, async deleteMany() { throw new Error("no table"); } } };

(async () => {
  const m = await import(pathToFileURL(join(ROOT, FILE)).href);
  await t("two requests at the same moment: exactly ONE gets the free Writing scoring", async () => {
    const s = uniqueStore();
    const r = await Promise.all([m.claimFreeAi("u1", "WRITING", s), m.claimFreeAi("u1", "WRITING", s)]);
    assert.deepEqual(r.slice().sort(), ["RESERVED", "USED"]);
  });
  await t("ten at once: still exactly one", async () => {
    const s = uniqueStore();
    const r = await Promise.all(Array.from({ length: 10 }, () => m.claimFreeAi("u2", "SPEAKING", s)));
    assert.equal(r.filter((x: string) => x === "RESERVED").length, 1);
  });
  await t("Writing and Speaking are separate free uses", async () => {
    const s = uniqueStore();
    assert.equal(await m.claimFreeAi("u3", "WRITING", s), "RESERVED");
    assert.equal(await m.claimFreeAi("u3", "SPEAKING", s), "RESERVED");
  });
  await t("a failed AI call gives the free use back", async () => {
    const s = uniqueStore();
    assert.equal(await m.claimFreeAi("u4", "WRITING", s), "RESERVED");
    await m.releaseFreeAi("u4", "WRITING", s);
    assert.equal(await m.claimFreeAi("u4", "WRITING", s), "RESERVED");
  });
  await t("before the migration (no table): UNAVAILABLE, so the caller keeps its old decision and nothing breaks", async () => {
    assert.equal(await m.claimFreeAi("u5", "WRITING", missingTable), "UNAVAILABLE");
    await m.releaseFreeAi("u5", "WRITING", missingTable);
  });
  console.log(failed ? `\nCLAIM TEST FAIL (${failed})` : "\nCLAIM TEST PASS");
  process.exitCode = failed ? 1 : 0;
})();
