// RR-418 · the OWNER's write (Parts A–F) — run by the owner only, through C:\Projects\_handoffs\RR418_owner_block.ps1. Never by the build.
//   npx tsx scripts/factory/rr418/apply-rr418.ts            dry run: writes nothing, prints the whole plan
//   $env:RR418_CONFIRM='YES'; npx tsx scripts/factory/rr418/apply-rr418.ts --apply     the write: ONE transaction, then the readback
// It reaches the database only through prisma443() (Neon, port 443). It stops before anything if an input's md5 differs.
// What it does:
//   A + B  model answers: nothing to write — they ship in the app's files (src/content/factory/rr418/model-answers-ab.json + Pack 1) and
//          are matched by item id. The dry run counts how many live Writing/Speaking items have them (must be all).
//   B      21 Speaking prompt fixes (Task 5 two screens, Task 6 options, 5 new titles), each only if the live row is still the one in the
//          owner's export of 27 Nov 2026.
//   C      286 Listening/Reading questions: 4 options, the new key, the "Why" — each only if its live options and key are the old ones.
//   D + E  the 10 full tests (50 stored parts), created if missing (key taskType + title); a Listening part whose clip has not passed the
//          listen check is created INACTIVE.
//   F      18 timings, 26 spellings, 1 Reading stem — each only if "now" matches.
//   ADD    addendum v1: Pack 1 Speaking Task 5 (Camping trip or city hotel) → two screens, third option the cottage, 60/60/60 (if "now").
//          Its Listening change (Test 4 Part 1 Section 3) is in the full tests themselves (readDe), and its model answers ship in the app.
// No table changes (RR-418 has no migration). Nothing is deleted. A row that differs from what a change expects is listed as BLOCKED and
// left as it is; the rest goes ahead.
import { readFileSync } from "node:fs";
import type { PrismaClient, Prisma } from "@prisma/client";
import { checkInputs, readDe } from "../../../src/lib/factory/rr418/inputs";
import { planBank, summarize, canon, type Change, type LiveRow } from "../../../src/lib/factory/rr418/plan";
import { fullTestItems, fullTestProblems, storedRow, FULL_TEST_TAG, type DeData, type Manifest } from "../../../src/lib/factory/rr418/full-tests";
import { rr418Inputs } from "./seed-plan";
import { MANIFEST_FILE } from "./audio";
import { prisma443, confirmed, TX_LIMITS } from "./db-443";

type Row = LiveRow & { difficulty: string; topicTag: string; active: boolean; audioUrl: string | null; audioDurationSec: number | null; guidanceNote: string | null; timeLimitSeconds: number };
const SELECT = { id: true, subTest: true, taskType: true, title: true, prompt: true, payload: true, difficulty: true, topicTag: true, active: true, audioUrl: true, audioDurationSec: true, guidanceNote: true, timeLimitSeconds: true } as const;
type Db = Pick<PrismaClient, "celpipItem">;

const key = (taskType: string, title: string) => `${taskType}::${title}`;

export async function plan(db: Db) {
  checkInputs();
  const de = readDe();
  const problems = fullTestProblems(de);
  if (problems.length) throw new Error(`the full tests do not have the official shape:\n  ${problems.join("\n  ")}`);
  const manifest = JSON.parse(readFileSync(MANIFEST_FILE, "utf8")) as Manifest;
  const { inp } = rr418Inputs();
  const rows = (await db.celpipItem.findMany({ select: SELECT, orderBy: { id: "asc" } })) as unknown as Row[];
  const bank = rows.filter((r) => r.topicTag !== FULL_TEST_TAG);
  const p = planBank(bank, inp);
  const changes: Change[] = [...p.rows.flatMap((r) => r.changes), ...p.missing];
  const updates = p.rows.filter((r) => r.changes.some((c) => c.status === "apply")).map((r) => ({ id: r.before.id, title: r.next.title, prompt: r.next.prompt, guidanceNote: r.next.guidanceNote ?? null, payload: r.next.payload }));

  // model answers: served by the app by item id (or taskType + final title)
  const { modelAnswersFor } = await import("../../../src/lib/celpip/model-answers");
  const finalTitle = new Map(p.rows.map((r) => [r.before.id, r.next.title]));
  const ws = bank.filter((r) => r.active && (r.subTest === "WRITING" || r.subTest === "SPEAKING"));
  const withModels = ws.filter((r) => modelAnswersFor(r.taskType, finalTitle.get(r.id) ?? r.title, r.id));

  // full tests
  const items = fullTestItems(de, manifest);
  const byKey = new Map(rows.map((r) => [key(r.taskType, r.title), r]));
  const ft = items.map((it) => {
    const have = byKey.get(key(it.taskType, it.title));
    const want = storedRow(it);
    if (!have) return { it, status: "create" as const };
    const same = have.subTest === want.subTest && have.prompt === want.prompt && canon(have.payload) === canon(want.payload) && have.topicTag === want.topicTag && have.active === want.active && have.audioUrl === want.audioUrl && have.audioDurationSec === want.audioDurationSec;
    return { it, status: same ? ("already" as const) : ("blocked" as const) };
  });

  // active counts per task type, before and after
  const count = (rs: { taskType: string; active: boolean }[]) => rs.reduce<Record<string, number>>((a, r) => (r.active ? ((a[r.taskType] = (a[r.taskType] ?? 0) + 1), a) : a), {});
  const before = count(rows);
  const after = count([...rows, ...ft.filter((x) => x.status === "create").map((x) => ({ taskType: x.it.taskType, active: x.it.active }))]);
  return { changes, updates, ws, withModels, ft, before, after, rows };
}

function report(r: Awaited<ReturnType<typeof plan>>) {
  const s = summarize(r.changes);
  const line = (part: string, label: string) => { const x = s[part] ?? { apply: 0, already: 0, blocked: 0 }; console.log(`${label}: ${x.apply} to apply, ${x.already} already applied, ${x.blocked} blocked (of ${x.apply + x.already + x.blocked})`); };
  console.log("RR-418 plan (nothing is written by a dry run)");
  console.log("migration: none (RR-418 changes no table)");
  console.log(`A+B model answers: ${r.withModels.length} of ${r.ws.length} live Writing/Speaking items have them; to attach in the database: 0 (they ship in the app and match by item id)`);
  line("B", "B speaking prompt fixes");
  line("C", "C listening/reading questions");
  line("F-timing", "F timings");
  line("F-spelling", "F spellings");
  line("F-stem", "F reading stem");
  line("ADD", "Addendum v1: Pack 1 Task 5 two screens");
  for (const c of r.changes.filter((c) => c.status === "blocked")) console.log(`  BLOCKED ${c.part} ${c.id} ${c.title} · ${c.what}: ${c.reason}`);
  const n = (st: string) => r.ft.filter((x) => x.status === st).length;
  console.log(`D+E full tests: ${r.ft.length} parts of 10 tests; to create ${n("create")}, already there ${n("already")}, there but different (NOT changed) ${n("blocked")}`);
  for (const x of r.ft.filter((x) => x.it.subTest === "LISTENING")) {
    const bad = x.it.audio.filter((a) => !a.ok);
    console.log(`  ${x.status === "create" ? "+" : x.status === "already" ? "=" : "!"} ${x.it.title.split(" — ")[0]}: audio ${x.it.audio.length - bad.length}/${x.it.audio.length} clips passed the listen check → ${x.it.active ? "ACTIVE" : `INACTIVE (${bad.map((b) => b.why).join("; ")})`}`);
  }
  console.log(`  reading parts: ${r.ft.filter((x) => x.it.subTest === "READING").length}, all ACTIVE`);
  console.log("active items per task type, before → after:");
  for (const t of [...new Set([...Object.keys(r.before), ...Object.keys(r.after)])].sort()) console.log(`  ${t}: ${r.before[t] ?? 0} → ${r.after[t] ?? 0}`);
  const tot = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  console.log(`  total active: ${tot(r.before)} → ${tot(r.after)}`);
}

export async function run(db: PrismaClient, opts: { apply: boolean; yes: boolean }): Promise<number> {
  const r = await plan(db);
  report(r);
  if (!opts.apply) { console.log("DRY RUN: nothing written."); return 0; }
  if (!opts.yes) { console.log("NOT WRITTEN: the write needs RR418_CONFIRM=YES (capital letters)."); return 1; }
  await db.$transaction(async (tx) => {
    const again = await plan(tx as unknown as Db); // the plan is made again inside the transaction: nothing changes between check and write
    for (const u of again.updates) await tx.celpipItem.update({ where: { id: u.id }, data: { title: u.title, prompt: u.prompt, guidanceNote: u.guidanceNote, payload: u.payload as Prisma.InputJsonValue } });
    const create = again.ft.filter((x) => x.status === "create").map((x) => storedRow(x.it));
    if (create.length) await tx.celpipItem.createMany({ data: create.map((c) => ({ ...c, subTest: c.subTest, taskType: c.taskType as never, difficulty: c.difficulty, payload: c.payload as Prisma.InputJsonValue })) });
  }, TX_LIMITS);
  const back = await plan(db);
  const s = summarize(back.changes);
  const left = Object.values(s).reduce((a, x) => a + x.apply, 0) + back.ft.filter((x) => x.status === "create").length;
  const blocked = Object.values(s).reduce((a, x) => a + x.blocked, 0) + back.ft.filter((x) => x.status === "blocked").length;
  const fullActive = back.rows.filter((x) => x.topicTag === FULL_TEST_TAG && x.active).length;
  console.log(`WROTE in one transaction. Readback: B ${s.B?.already ?? 0}, C ${s.C?.already ?? 0}, F ${(s["F-timing"]?.already ?? 0) + (s["F-spelling"]?.already ?? 0) + (s["F-stem"]?.already ?? 0)} in place; addendum ${s.ADD?.already ?? 0} in place; full-test parts present ${back.ft.length - back.ft.filter((x) => x.status === "create").length} of ${back.ft.length} (${fullActive} active); model answers ${back.withModels.length} of ${back.ws.length}; blocked ${blocked}; left to do ${left}.`);
  return left === 0 ? 0 : 1;
}

if (process.argv[1] && /apply-rr418\.ts$/.test(process.argv[1])) {
  const apply = process.argv.includes("--apply");
  const db = prisma443();
  run(db, { apply, yes: confirmed() })
    .then((code) => { process.exitCode = code; })
    .catch((e) => { console.error(`STOPPED: ${String((e as Error)?.message ?? e).slice(0, 600)}`); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}
