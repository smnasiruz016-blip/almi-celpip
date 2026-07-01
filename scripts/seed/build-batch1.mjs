// Assembles the four Batch-1 drafter outputs (raw/{listening,reading,writing,
// speaking}.json) into scripts/seed/batch1.ts. Idempotent: re-run safely.
//
// Batch 1 tops every skill up to >=48 items (~192 total) across the OFFICIAL CELPIP
// parts/tasks (no new task types — extends the existing enums only). Items are plain
// CelpipItemCreateManyInput objects; append.ts imports this batch alongside the four
// hand-authored seed files and seeds it on deploy (dedup key = taskType::title).
//
// 100% original, Canadian-English content — never copied from Paragon/CELPIP
// official materials.
//
// Run: node scripts/seed/build-batch1.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = resolve(__dirname, "raw");

const DRAFTERS = ["listening", "reading", "writing", "speaking"];

// valid task types per sub-test (the repo enum — extend within, add none)
const TASK_TYPES = {
  LISTENING: ["LISTENING_PROBLEM_SOLVING", "LISTENING_DAILY_LIFE", "LISTENING_INFORMATION", "LISTENING_NEWS", "LISTENING_DISCUSSION", "LISTENING_VIEWPOINTS"],
  READING: ["READING_CORRESPONDENCE", "READING_DIAGRAM", "READING_INFORMATION", "READING_VIEWPOINTS"],
  WRITING: ["WRITING_EMAIL", "WRITING_SURVEY"],
  SPEAKING: ["SPEAKING_ADVICE", "SPEAKING_PERSONAL_EXPERIENCE", "SPEAKING_DESCRIBE_SCENE", "SPEAKING_PREDICTIONS", "SPEAKING_COMPARE_PERSUADE", "SPEAKING_DIFFICULT_SITUATION", "SPEAKING_OPINIONS", "SPEAKING_UNUSUAL_SITUATION"],
};
const SUBTEST_OF = {};
for (const [st, tts] of Object.entries(TASK_TYPES)) for (const tt of tts) SUBTEST_OF[tt] = st;

// per-task-type top-up targets (must be met exactly)
const TARGET = {
  LISTENING_PROBLEM_SOLVING: 7, LISTENING_DAILY_LIFE: 4, LISTENING_INFORMATION: 5, LISTENING_NEWS: 4, LISTENING_DISCUSSION: 6, LISTENING_VIEWPOINTS: 4,
  READING_CORRESPONDENCE: 10, READING_DIAGRAM: 6, READING_INFORMATION: 7, READING_VIEWPOINTS: 9,
  WRITING_EMAIL: 16, WRITING_SURVEY: 16,
  SPEAKING_ADVICE: 4, SPEAKING_PERSONAL_EXPERIENCE: 4, SPEAKING_DESCRIBE_SCENE: 4, SPEAKING_PREDICTIONS: 4, SPEAKING_COMPARE_PERSUADE: 4, SPEAKING_DIFFICULT_SITUATION: 4, SPEAKING_OPINIONS: 4, SPEAKING_UNUSUAL_SITUATION: 4,
};
// speaking prep/speak anchors per task type
const SP_TIMING = {
  SPEAKING_ADVICE: [30, 90], SPEAKING_PERSONAL_EXPERIENCE: [30, 90], SPEAKING_DESCRIBE_SCENE: [30, 60], SPEAKING_PREDICTIONS: [30, 60], SPEAKING_COMPARE_PERSUADE: [60, 120], SPEAKING_DIFFICULT_SITUATION: [60, 90], SPEAKING_OPINIONS: [30, 90], SPEAKING_UNUSUAL_SITUATION: [30, 60],
};

const ALLOWED_ITEM_KEYS = new Set(["subTest", "taskType", "title", "prompt", "difficulty", "topicTag", "guidanceNote", "payload"]);
const VALID_DIFF = new Set(["FOUNDATION", "CORE", "STRETCH"]);

function extractJson(raw) {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse((fence ? fence[1] : raw).trim());
}
function optOk(q) {
  return Array.isArray(q.options) && q.options.length >= 2 && q.options.some((o) => o.id === q.answer);
}

const all = [];
let problems = 0;
for (const id of DRAFTERS) {
  let raw;
  try { raw = readFileSync(`${RAW}/${id}.json`, "utf8"); } catch { console.warn(`SKIP ${id}: not found`); continue; }
  if (!raw.trim()) { console.warn(`SKIP ${id}: empty`); continue; }
  let items;
  try { items = extractJson(raw); } catch (e) { console.error(`PARSE FAIL ${id}: ${e.message}`); process.exit(1); }
  for (const it of items) {
    const clean = {};
    for (const k of Object.keys(it)) if (ALLOWED_ITEM_KEYS.has(k)) clean[k] = it[k];
    // force subTest from taskType (belt + braces)
    if (SUBTEST_OF[clean.taskType]) clean.subTest = SUBTEST_OF[clean.taskType];
    all.push(clean);
  }
}

// ---- integrity ----
for (const it of all) {
  const where = `${it.taskType} "${it.title}"`;
  if (!SUBTEST_OF[it.taskType]) { console.error(`BAD taskType (not in enum): ${where}`); problems++; continue; }
  if (it.subTest !== SUBTEST_OF[it.taskType]) { console.error(`BAD subTest: ${where}`); problems++; }
  if (!VALID_DIFF.has(it.difficulty)) { console.error(`BAD difficulty: ${where}`); problems++; }
  if (!it.title || !it.prompt || !it.topicTag) { console.error(`MISSING core field: ${where}`); problems++; }
  const p = it.payload ?? {};
  const st = SUBTEST_OF[it.taskType];
  if (st === "LISTENING") {
    if (typeof p.audioScript !== "string" || !p.audioScript.trim()) { console.error(`BAD audioScript: ${where}`); problems++; }
    if (!Array.isArray(p.speakers) || p.speakers.length < 1 || !p.speakers.every((s) => s.role && s.voice)) { console.error(`BAD speakers: ${where}`); problems++; }
    if (!Array.isArray(p.questions) || p.questions.length < 1) { console.error(`BAD questions: ${where}`); problems++; }
    else for (const q of p.questions) if (!q.id || !q.stem || !optOk(q)) { console.error(`BAD L question: ${where} / ${q.id}`); problems++; }
  } else if (st === "READING") {
    if (!Array.isArray(p.passages) || p.passages.length < 1 || !p.passages[0]?.body) { console.error(`BAD passages: ${where}`); problems++; }
    if (!Array.isArray(p.questions) || p.questions.length < 1) { console.error(`BAD questions: ${where}`); problems++; }
    else for (const q of p.questions) {
      if (q.kind !== "mcq" && q.kind !== "match") { console.error(`BAD kind: ${where} / ${q.id} → ${q.kind}`); problems++; }
      if (!q.id || !q.stem || !optOk(q)) { console.error(`BAD R question: ${where} / ${q.id}`); problems++; }
    }
  } else if (it.taskType === "WRITING_EMAIL") {
    if (typeof p.situation !== "string" || typeof p.instruction !== "string") { console.error(`BAD email payload: ${where}`); problems++; }
    if (p.wordMin !== 150 || p.wordMax !== 200) { console.error(`BAD email words: ${where} → ${p.wordMin}-${p.wordMax}`); problems++; }
  } else if (it.taskType === "WRITING_SURVEY") {
    if (typeof p.topic !== "string" || typeof p.optionA !== "string" || typeof p.optionB !== "string" || typeof p.instruction !== "string") { console.error(`BAD survey payload: ${where}`); problems++; }
    if (p.wordMin !== 150 || p.wordMax !== 200) { console.error(`BAD survey words: ${where} → ${p.wordMin}-${p.wordMax}`); problems++; }
  } else if (st === "SPEAKING") {
    if (typeof p.taskPrompt !== "string" || !p.taskPrompt.trim()) { console.error(`BAD taskPrompt: ${where}`); problems++; }
    const [prep, speak] = SP_TIMING[it.taskType];
    if (p.prepSeconds !== prep || p.speakSeconds !== speak) { console.error(`BAD timing: ${where} → ${p.prepSeconds}/${p.speakSeconds} (want ${prep}/${speak})`); problems++; }
  }
}

// ---- per-task-type counts ----
const counts = {};
for (const it of all) counts[it.taskType] = (counts[it.taskType] ?? 0) + 1;
for (const [tt, want] of Object.entries(TARGET)) {
  const got = counts[tt] ?? 0;
  if (got !== want) { console.error(`COUNT ${tt}: got ${got}, want ${want}`); problems++; }
}

// ---- title dedup (key = taskType::title). Auto-disambiguate vs existing seed
// files (titles carry an em dash) and within the batch. ----
const existing = new Set();
for (const f of ["listening", "reading", "writing", "speaking"]) {
  const txt = readFileSync(resolve(__dirname, `${f}.ts`), "utf8");
  const re = /"((?:[^"\\]|\\.)*—(?:[^"\\]|\\.)*)"/g; // strings containing an em dash = titles
  let m; while ((m = re.exec(txt))) existing.add(m[1]);
}
const used = new Set([...existing].map((t) => `x::${t}`)); // conservative: block title globally
let renamed = 0;
for (const it of all) {
  let title = it.title, n = 1;
  while (used.has(`${it.taskType}::${title}`) || used.has(`x::${title}`)) { n++; title = `${it.title} (${n})`; }
  if (title !== it.title) renamed++;
  it.title = title;
  used.add(`${it.taskType}::${title}`);
}

// ---- report ----
console.log("\nPer-task-type counts (new items):");
for (const st of Object.keys(TASK_TYPES)) {
  const line = TASK_TYPES[st].map((tt) => `${tt.replace(st + "_", "")}=${counts[tt] ?? 0}`).join("  ");
  const total = TASK_TYPES[st].reduce((a, tt) => a + (counts[tt] ?? 0), 0);
  console.log(`  ${st} (+${total}): ${line}`);
}
console.log(`Total new items: ${all.length}  (existing 66 → end-state ${66 + all.length})`);
console.log(`Titles auto-renamed on collision: ${renamed}`);

if (problems) { console.error(`\n${problems} problem(s) — batch1.ts NOT written.`); process.exit(1); }

// ---- emit ----
const header = `// Batch 1 — original CELPIP-General content depth, topping every skill up to >=48
// items (~192 total end-state) across the official parts/tasks. Plain
// CelpipItemCreateManyInput objects; append.ts imports this alongside the four
// hand-authored seed files and seeds on deploy (dedup key = taskType::title).
//
// 100% original, Canadian-English — never copied from Paragon/CELPIP materials.
// Generated by scripts/seed/build-batch1.mjs — do not edit by hand.

import type { Prisma } from "@prisma/client";

export const ITEMS: Prisma.CelpipItemCreateManyInput[] = `;

writeFileSync(resolve(__dirname, "batch1.ts"), header + JSON.stringify(all, null, 2) + ";\n", "utf8");
console.log(`\nWrote scripts/seed/batch1.ts (${all.length} items).`);
