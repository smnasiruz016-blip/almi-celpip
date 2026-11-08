// RR-401 · THE CONTENT FACTORY, PROVED. Offline: no database, no network, no model call.
//
//   npx tsx scripts/factory/verify-factory.test.ts
//
// What it proves:
//   1. word counts: our count of every answer EQUALS the pack's table;
//   2. the committed data is exactly what the gates let through (re-import from the recorded LanguageTool findings is
//      byte-identical): the import is idempotent, and nothing was hand-edited;
//   3. a blocked item stays out (the two real blocks, and a planted error);
//   4. the seed: a dry run writes nothing; the write is idempotent; an image-pending item is never written;
//   5. `seed:prod` (scripts/seed/append.ts) cannot write factory items: it never reads the factory data, and no seed title is a
//      factory title, so the next build adds nothing from this pack.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { countWords, parsePack } from "../../src/lib/factory/celpip-pack";
import { importPack, TITLES, type ModelData } from "../../src/lib/factory/import";
import type { LtMatch } from "../../src/lib/factory/grammar-gate";
import { runSeed, type ItemStore, type LiveRow, type SeedRow } from "../../src/lib/factory/seed-plan";
import { modelAnswersFor } from "../../src/lib/celpip/model-answers";
import { existingSeedTexts } from "./existing-seed";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

const ROOT = process.cwd();
const PACK_FILE = "AlmiCELPIP_Pack1.md";
const pack = parsePack(readFileSync(join(ROOT, "scripts", "factory", "fixtures", PACK_FILE), "utf8"), PACK_FILE);
const findings: Record<string, LtMatch[]> = JSON.parse(readFileSync(join(ROOT, "scripts", "factory", "fixtures", "lt-en-CA-findings.json"), "utf8"));
const key = (text: string, lang: string) => createHash("sha256").update(`${lang}\n${text}`).digest("hex");
const recordedLt = (text: string, lang: string) => findings[key(text, lang)] ?? [];
const existing = existingSeedTexts();
const committedRaw = readFileSync(join(ROOT, "src", "content", "factory", "celpip-model-answers.json"), "utf8");
const committed: ModelData = JSON.parse(committedRaw);

console.log("1. word counts");
check("the pack has 13 items: 3 emails, 2 surveys, 8 speaking tasks", pack.items.length === 13
  && pack.items.filter((i) => i.kind === "email").length === 3 && pack.items.filter((i) => i.kind === "survey").length === 2);
check("the pack's table has 24 rows, one per answer", pack.wordTable.length === 24 && pack.items.reduce((n, i) => n + i.answers.length, 0) === 24);
const wc = pack.items.flatMap((it) => it.answers.map((a) => ({ name: `${it.tableName}/${a.level}`, n: countWords(a.text), t: pack.wordTable.find((r) => r.item === it.tableName && r.level === a.level)?.words })));
const wcBad = wc.filter((x) => x.n !== x.t);
check("every answer's word count equals the pack's table (24/24)", wcBad.length === 0, wcBad.map((x) => `${x.name}: ${x.n} vs ${x.t}`).join("; "));
const shown = committed.items.flatMap((i) => i.answers.map((a) => ({ i, a })));
check("every committed answer carries the table's count", shown.every(({ i, a }) => pack.wordTable.find((r) => r.item === i.packItem && r.level === a.level)?.words === a.wordCount));

console.log("2. the committed data is the gated import, and the import is idempotent");
const r1 = importPack(pack, recordedLt, existing);
const r2 = importPack(pack, recordedLt, existing);
const body = JSON.stringify(r1.data, null, 1) + "\n";
check("importing twice gives byte-identical data", body === JSON.stringify(r2.data, null, 1) + "\n");
check("the committed JSON equals a fresh import (nothing hand-edited)", body === committedRaw);
check("13 items imported: 11 ready, 2 image pending", committed.items.length === 13 && committed.items.filter((i) => i.status === "ready").length === 11);

console.log("3. a blocked item stays out");
const blockedWhere = r1.blocked.map((b) => b.where).join(" | ");
check("after beta-g's round-2 fixes: 0 blocks, all 24 answers in the data", r1.blocked.length === 0
  && committed.items.reduce((n, i) => n + i.answers.length, 0) === 24, blockedWhere);
const s1 = committed.items.find((i) => i.packItem === "Speaking Task 1");
check("Speaking Task 1's Level 7 sample is in, with its notes", !!s1 && s1.answers.some((a) => a.level === "7" && a.notes.length === 1 && a.notes[0].text.length > 10));
const noNotes = pack.items.map((it) => ({ ...it, answers: it.answers.map((a) => (it.tableName === "Speaking Task 1" && a.level === "7" ? { ...a, notes: [] } : a)) }));
const r4 = importPack({ ...pack, items: noNotes }, recordedLt, existing);
check("a model without notes stays out", !r4.data.items.find((i) => i.packItem === "Speaking Task 1")!.answers.some((a) => a.level === "7")
  && r4.blocked.some((b) => /Speaking Task 1 .*Level 7/.test(b.where) && /no notes/.test(b.reason)));
const e2Notes = pack.items.find((i) => i.tableName === "Email 2")!.answers.find((a) => a.level === "10+")!;
const e2Text = e2Notes.notes.map((n) => `${n.criterion}: ${n.text}`).join("\n");
const notePlant = (text: string, lang: string): LtMatch[] => text.startsWith("Content/Coherence: three specific examples")
  ? [{ offset: text.indexOf("semiformal"), length: 10, message: "planted", rule: { id: "PLANTED", category: { id: "TYPOS" } } }] : recordedLt(text, lang);
check("a planted error in a note keeps that answer out", e2Text.includes("semiformal")
  && !importPack(pack, notePlant, existing).data.items.find((i) => i.packItem === "Email 2")!.answers.some((a) => a.level === "10+"));
const e1Top = pack.items.find((i) => i.tableName === "Email 1")!.answers.find((a) => a.level === "10+")!.text;
const planted = (text: string, lang: string): LtMatch[] => text === e1Top
  ? [{ offset: 0, length: 4, message: "planted", rule: { id: "PLANTED", issueType: "grammar", category: { id: "GRAMMAR" } } }]
  : recordedLt(text, lang);
const r3 = importPack(pack, planted, existing);
check("a planted grammar error in Email 1's 10+ answer keeps that answer out", !r3.data.items.find((i) => i.packItem === "Email 1")!.answers.some((a) => a.level === "10+")
  && r3.blocked.some((b) => /Email 1 .*CELPIP 10\+ · answer/.test(b.where)));
const e1Prompt = (text: string, lang: string): LtMatch[] => text.startsWith("A construction company")
  ? [{ offset: 2, length: 12, message: "planted", rule: { id: "PLANTED", category: { id: "TYPOS" } } }] : recordedLt(text, lang);
check("a planted error in a prompt keeps the whole item out", !importPack(pack, e1Prompt, existing).data.items.some((i) => i.packItem === "Email 1"));
const low = (text: string, lang: string): LtMatch[] => text.startsWith("I choose library")
  ? [{ offset: 0, length: 8, message: "planted", rule: { id: "PLANTED", category: { id: "GRAMMAR" } } }] : recordedLt(text, lang);
check("a CELPIP 5 answer is not grammar-checked (its mistakes are on purpose)", importPack(pack, low, existing).data.items.find((i) => i.packItem === "Survey 1")!.answers.some((a) => a.level === "5"));

console.log("4. image pending and the owner's seed");
const pending = committed.items.filter((i) => i.status === "image-pending").map((i) => i.packItem).sort();
check("the scene tasks (Speaking Tasks 3 and 4) are image pending", pending.join(",") === "Speaking Task 3,Speaking Task 4", pending.join(","));
check("the app never shows an image-pending item", committed.items.filter((i) => i.status === "image-pending").every((i) => modelAnswersFor(i.taskType, i.title) === null));
check("the app shows every ready item", committed.items.filter((i) => i.status === "ready").every((i) => modelAnswersFor(i.taskType, i.title)?.id === i.id));
function fakeStore(rows: LiveRow[]): ItemStore & { writes: SeedRow[] } {
  const writes: SeedRow[] = [];
  return {
    writes,
    async findMany({ where }) { return rows.filter((r) => where.taskType.in.includes(r.taskType)); },
    async create({ data }) { writes.push(data); rows.push({ taskType: data.taskType, title: data.title, prompt: data.prompt, payload: JSON.parse(JSON.stringify(data.payload)) }); },
  };
}
const live: LiveRow[] = existing.filter((e) => e.taskType.startsWith("WRITING") || e.taskType.startsWith("SPEAKING")).map((e) => ({ taskType: e.taskType, title: e.title, prompt: "", payload: {} }));
const before = live.length;
const store = fakeStore(live);
const dry = await runSeed(store, committed, false);
check("a dry run writes nothing", store.writes.length === 0 && live.length === before && dry.plan.create.length === 11, `would create ${dry.plan.create.length}`);
const w1 = await runSeed(store, committed, true);
check("the write creates the 11 ready items", w1.written === 11 && store.writes.length === 11);
check("an image-pending item is never written", !store.writes.some((w) => /Describe a Scene|Making Predictions/.test(w.title)));
const w2 = await runSeed(store, committed, true);
check("the write is idempotent (a second write creates nothing; all 11 'equal')", w2.written === 0 && w2.plan.same.length === 11 && store.writes.length === 11);
check("every written row is active, CORE, and has the composer's payload keys", store.writes.every((w) => w.active && w.difficulty === "CORE"
  && (w.taskType === "WRITING_EMAIL" ? "situation" in w.payload : w.taskType === "WRITING_SURVEY" ? "optionA" in w.payload : "taskPrompt" in w.payload)));

console.log("5. seed:prod cannot write factory items");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
check("seed:prod is still scripts/seed/append.ts", /tsx scripts\/seed\/append\.ts/.test(pkg.scripts["seed:prod"]));
const seedDir = join(ROOT, "scripts", "seed");
const seedSrc = readdirSync(seedDir).filter((f) => /\.(ts|mts|mjs|js)$/.test(f)).map((f) => ({ f, s: readFileSync(join(seedDir, f), "utf8") }));
const leaks = seedSrc.filter(({ s }) => /factory|celpip-model-answers/.test(s)).map(({ f }) => f);
check("no file in scripts/seed reads the factory data", leaks.length === 0, leaks.join(", "));
const append = readFileSync(join(seedDir, "append.ts"), "utf8");
const imports = [...append.matchAll(/from "(\.[^"]+)"/g)].map((m) => m[1]).sort().join(",");
check("append.ts imports only the five seed files", imports === "./batch1,./listening,./reading,./speaking,./writing", imports);
const seedKeys = new Set(existing.map((e) => `${e.taskType}::${e.title}`));
const clash = committed.items.filter((i) => seedKeys.has(`${i.taskType}::${i.title}`)).map((i) => i.title);
check("no seed title is a factory title (seed:prod adds nothing from this pack)", clash.length === 0, clash.join(", "));
check("every pack item has a unique product title", new Set(Object.values(TITLES)).size === Object.keys(TITLES).length);

console.log(`\n${fail === 0 ? "GREEN" : "RED"}: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
