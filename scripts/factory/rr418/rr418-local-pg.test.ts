// RR-418 · the owner's run, for real, against a LOCAL Postgres (never production), with the owner's EXACT client (prisma443(): Prisma +
// @prisma/adapter-neon + the Neon serverless driver over a WebSocket; here the WebSocket goes to a local proxy instead of Neon's port-443
// endpoint). The database is built with this repo's migrations and filled from the owner's export DB_CELPIP_EXPORT.json (203 live items,
// with their own ids). RR-418 has NO migration, so "migration applied / not applied" is one state; the states that differ are:
//   A. production as exported (the deploy's seed:prod has not run yet);
//   B. the deploy's seed:prod has already run (it must have inserted nothing — no duplicate for a renamed item, no full test);
//   C. a live question was edited after the export (drift): that ONE question is BLOCKED, the rest is written.
// Each: the dry run, the write with YES (one interactive transaction, 300 s timeout), the readback, a second dry run (nothing to do), and
// seed:prod after the write (inserts nothing). Needs PostgreSQL binaries (PG_BIN, default C:\Program Files\PostgreSQL\18\bin).
//   npx tsx scripts/factory/rr418/rr418-local-pg.test.ts
import { spawnSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { PrismaClient, type Prisma } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { prisma443 } from "./db-443";
import { run } from "./apply-rr418";
import { startWsTcpProxy } from "./ws-tcp-proxy";
import { keyOf } from "./seed-plan";
import { presentKeys, seedItems } from "../../seed/append";

const PG_BIN = process.env.PG_BIN ?? "C:\\Program Files\\PostgreSQL\\18\\bin";
const exe = (n: string) => join(PG_BIN, process.platform === "win32" ? `${n}.exe` : n);
if (!existsSync(exe("initdb"))) { console.log(`SKIPPED — no PostgreSQL binaries at ${PG_BIN}`); process.exit(0); }

const PORT = 55400 + Math.floor(Math.random() * 400);
const DIR = mkdtempSync(join(tmpdir(), "rr418pg-"));
const sh = (cmd: string, args: string[], env: Record<string, string> = {}) => {
  const r = spawnSync(cmd, args, { windowsHide: true, encoding: "utf8", env: { ...process.env, ...env }, shell: false });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: ${r.stderr || r.stdout}`);
  return r.stdout;
};
const psql = (db: string, sql: string) => sh(exe("psql"), ["-h", "127.0.0.1", "-p", String(PORT), "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-qAt", "-c", sql]);
const local = (db: string) => `postgresql://postgres@127.0.0.1:${PORT}/${db}`;

type ExportRow = { id: string; subTest: string; taskType: string; title: string; prompt: string; payload: unknown; difficulty: string; audioUrl: string | null; audioDurationSec: number | null; guidanceNote: string | null; timeLimitSeconds: number; topicTag: string; active: boolean; createdAt: string };
const EXPORT = (JSON.parse(readFileSync("scripts/factory/fixtures/rr418/DB_CELPIP_EXPORT.json", "utf8")) as { items: ExportRow[] }).items;

async function fill(db: string) {
  const c = new PrismaClient({ datasources: { db: { url: local(db) } } });
  await c.celpipItem.createMany({ data: EXPORT.map((r) => ({ ...r, subTest: r.subTest as never, taskType: r.taskType as never, difficulty: r.difficulty as never, payload: r.payload as Prisma.InputJsonValue, createdAt: new Date(r.createdAt) })) });
  await c.$disconnect();
}
/** seed:prod's own decision (scripts/seed/append.ts), run against the local database: how many rows it would insert */
async function seedProdInserts(db: string, write: boolean): Promise<string[]> {
  const c = new PrismaClient({ datasources: { db: { url: local(db) } } });
  const all = seedItems(); // seed:prod's own items
  const seen = presentKeys(await c.celpipItem.findMany({ select: { taskType: true, title: true } }));
  const add = all.filter((it) => !seen.has(keyOf(String(it.taskType), it.title)));
  if (write && add.length) await c.celpipItem.createMany({ data: add });
  await c.$disconnect();
  return add.map((a) => a.title);
}
async function capture(f: () => Promise<number>): Promise<{ code: number; out: string }> {
  const lines: string[] = [], log = console.log;
  console.log = (...a: unknown[]) => { lines.push(a.map(String).join(" ")); };
  try { return { code: await f(), out: lines.join("\n") }; } finally { console.log = log; }
}

let pg: ReturnType<typeof spawn> | null = null;
let pass = 0, fail = 0;
(async () => {
  const t = async (name: string, f: () => Promise<void>) => { try { await f(); pass++; console.log(`  PASS  ${name}`); } catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${String((e as Error).message).split("\n").slice(0, 8).join("\n        ")}`); } };
  try {
    sh(exe("initdb"), ["-D", DIR + "/data", "-U", "postgres", "-A", "trust", "-E", "UTF8"]);
    pg = spawn(exe("postgres"), ["-D", DIR + "/data", "-p", String(PORT), "-c", "listen_addresses=127.0.0.1"], { windowsHide: true, stdio: "ignore" });
    for (let i = 0; i < 60; i++) { if (spawnSync(exe("pg_isready"), ["-h", "127.0.0.1", "-p", String(PORT)], { windowsHide: true }).status === 0) break; await new Promise((r) => setTimeout(r, 500)); }
    psql("postgres", "CREATE DATABASE rr418a");
    // the schema exactly as production has it: this repo's own migrations, applied by prisma migrate deploy
    sh(process.execPath, [join("node_modules", "prisma", "build", "index.js"), "migrate", "deploy"], { DATABASE_URL: local("rr418a"), DATABASE_URL_UNPOOLED: local("rr418a") });
    await fill("rr418a");
    psql("postgres", "CREATE DATABASE rr418b TEMPLATE rr418a");
    psql("postgres", "CREATE DATABASE rr418c TEMPLATE rr418a");
    await t("B: the deploy's seed:prod, run BEFORE the owner's write, inserts nothing", async () => assert.deepEqual(await seedProdInserts("rr418b", true), []));
    // C: one live question edited after the export (cmr2p0o4m0007hsbz4603uc7j q2: an option's text)
    psql("rr418c", `UPDATE "CelpipItem" SET payload = jsonb_set(payload, '{questions,1,options,0,text}', '"Six o''clock sharp."') WHERE id = 'cmr2p0o4m0007hsbz4603uc7j'`);

    const proxy = await startWsTcpProxy(PORT);
    const owners = (db: string) => {
      const c = prisma443(`postgresql://postgres@ep-local-rr418.neon.tech/${db}`);
      neonConfig.useSecureWebSocket = false;
      neonConfig.wsProxy = () => `127.0.0.1:${proxy.port}/v2`;
      return c;
    };
    for (const [db, label, drift] of [["rr418a", "A: production as exported", false], ["rr418b", "B: after the deploy's seed:prod", false], ["rr418c", "C: one live question drifted", true]] as const) {
      const c = owners(db);
      await t(`${label} — the DRY RUN over the owner's Neon adapter`, async () => {
        const r = await capture(() => run(c, { apply: false, yes: false }));
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /migration: none/);
        assert.match(r.out, /A\+B model answers: 107 of 107 live Writing\/Speaking items have them/);
        assert.match(r.out, /B speaking prompt fixes: 21 to apply, 0 already applied, 0 blocked \(of 21\)/);
        assert.match(r.out, drift ? /C listening\/reading questions: 285 to apply, 0 already applied, 1 blocked \(of 286\)/ : /C listening\/reading questions: 286 to apply, 0 already applied, 0 blocked \(of 286\)/);
        if (drift) assert.match(r.out, /BLOCKED C cmr2p0o4m0007hsbz4603uc7j .* q2: now differs/);
        assert.match(r.out, /F timings: 18 to apply/); assert.match(r.out, /F spellings: 26 to apply/); assert.match(r.out, /F reading stem: 1 to apply/);
        assert.match(r.out, /D\+E full tests: 50 parts of 10 tests; to create 50, already there 0, there but different \(NOT changed\) 0/);
        assert.match(r.out, /total active: 203 → 2\d\d/);
        assert.match(r.out, /DRY RUN: nothing written\./);
      });
      await t(`${label} — without YES nothing is written`, async () => {
        const r = await capture(() => run(c, { apply: true, yes: false }));
        assert.equal(r.code, 1); assert.match(r.out, /NOT WRITTEN/);
        assert.equal(psql(db, `SELECT count(*) FROM "CelpipItem" WHERE "topicTag" = 'full-test'`).trim(), "0");
      });
      await t(`${label} — the WRITE with YES (one transaction) and the readback: left to do 0`, async () => {
        const r = await capture(() => run(c, { apply: true, yes: true }));
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, drift ? /WROTE in one transaction\. Readback: B 21, C 285, F 45 in place; full-test parts present 50 of 50 \(\d+ active\); model answers 107 of 107; blocked 1; left to do 0\./ : /WROTE in one transaction\. Readback: B 21, C 286, F 45 in place; full-test parts present 50 of 50 \(\d+ active\); model answers 107 of 107; blocked 0; left to do 0\./);
      });
      await t(`${label} — a second dry run finds nothing to do`, async () => {
        const r = await capture(() => run(c, { apply: false, yes: false }));
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /B speaking prompt fixes: 0 to apply, 21 already applied/);
        assert.match(r.out, drift ? /C listening\/reading questions: 0 to apply, 285 already applied, 1 blocked/ : /C listening\/reading questions: 0 to apply, 286 already applied, 0 blocked/);
        assert.match(r.out, /to create 0, already there 50, there but different \(NOT changed\) 0/);
      });
      await t(`${label} — seed:prod AFTER the write inserts nothing (no duplicate of a renamed item or of a full test)`, async () => assert.deepEqual(await seedProdInserts(db, false), []));
      await t(`${label} — the database: 5 renamed titles, no old title left, the drifted question untouched`, async () => {
        assert.equal(psql(db, `SELECT count(*) FROM "CelpipItem" WHERE title LIKE '%A clock that tells the weather'`).trim(), "1");
        assert.equal(psql(db, `SELECT count(*) FROM "CelpipItem" WHERE title LIKE '%A moose walking down your street'`).trim(), "0");
        assert.equal(psql(db, `SELECT count(*) FROM (SELECT "taskType", title FROM "CelpipItem" GROUP BY 1, 2 HAVING count(*) > 1) d`).trim(), "0");
        const q2 = psql(db, `SELECT jsonb_array_length(payload->'questions'->1->'options') FROM "CelpipItem" WHERE id = 'cmr2p0o4m0007hsbz4603uc7j'`).trim();
        assert.equal(q2, drift ? "3" : "4");
      });
      await c.$disconnect();
    }
    proxy.server.close();
  } finally {
    if (pg?.pid) { spawnSync(exe("pg_ctl"), ["-D", DIR + "/data", "stop", "-m", "immediate"], { windowsHide: true }); }
    try { rmSync(DIR, { recursive: true, force: true }); } catch { /* the data dir can stay locked a moment on Windows */ }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();
