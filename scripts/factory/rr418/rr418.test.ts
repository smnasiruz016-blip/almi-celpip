// RR-418 · the offline proofs (no network, no database). npm run verify:rr418
// Each check below reads the data the product consumes: the committed inputs (md5-checked), the owner's export of 27 Nov 2026 as "live",
// the seed source, the app's model-answer file, the audio manifest and the listen transcripts.
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { inputProblems, checkInputs, readDe, INPUT_DIR } from "../../../src/lib/factory/rr418/inputs";
import { planBank, planRow, summarize, renames, canon } from "../../../src/lib/factory/rr418/plan";
import { fullTestItems, clipsOf, clipOk, sha, type DeData, type Manifest } from "../../../src/lib/factory/rr418/full-tests";
import { listenResults } from "../../../src/lib/factory/rr418/listen-check";
import { modelAnswersFor } from "../../../src/lib/celpip/model-answers";
import { buildObjectiveReview, whyOf } from "../../../src/lib/celpip/review";
import { sanitizePayload } from "../../../src/lib/celpip/client-payload";
import { scoreReading, readingPayloadSchema } from "../../../src/lib/celpip/tasks/reading";
import { WhyBox } from "../../../src/components/celpip/WhyBox";
import { seedWithRr418, rr418Inputs, keyOf, SOURCE } from "./seed-plan";
import { presentKeys, seedSkipReason, seedItems } from "../../seed/append";
import { buildOverrides, OVERRIDES_FILE } from "./build-seed-overrides";
import { buildModelFile, MODEL_FILE } from "./build-model-answers";
import { MANIFEST_FILE, TRANSCRIPTS_FILE } from "./audio";
import { timingProblems, keyProblems, fullTestShapeProblems, mismatchProblems, TIMING_NOT_FIXED, PACK1_TOP_ONLY, ADDENDUM_PACK1 } from "./checks";

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = "") => { if (ok) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); } };
const none = (name: string, problems: string[]) => check(name, problems.length === 0, problems.slice(0, 6).join(" | "));

// 1 · md5: any difference stops the run
none("the four inputs and the addendum are exactly the approved files (md5)", inputProblems());
{
  const tampered = (p: string) => { const b = readFileSync(p); return p.endsWith("DE_full_tests.json") ? Buffer.concat([b, Buffer.from(" ")]) : b; };
  const pr = inputProblems(INPUT_DIR, tampered);
  check("one changed byte is caught, by its file", pr.length === 1 && pr[0].startsWith("DE_full_tests.json: md5"), pr.join(","));
  let threw = false; try { checkInputs(INPUT_DIR, tampered); } catch { threw = true; }
  check("…and stops the run (checkInputs throws)", threw);
}

const { inp, exportRows } = rr418Inputs();
const de = readDe();
const manifest: Manifest | null = existsSync(MANIFEST_FILE) ? JSON.parse(readFileSync(MANIFEST_FILE, "utf8")) : null;
const bank = planBank(exportRows, inp);
const after = bank.rows.map((r) => r.next);

// 2 · the plan on the live rows: every change applies, none blocked, none missing
const s = summarize([...bank.rows.flatMap((r) => r.changes), ...bank.missing]);
check("Part C: 286 questions to apply, 0 blocked", s.C?.apply === 286 && !s.C?.blocked, JSON.stringify(s.C));
check("Part B: 21 prompt fixes to apply, 0 blocked", s.B?.apply === 21 && !s.B?.blocked, JSON.stringify(s.B));
check("Part F: 18 timings, 26 spellings, 1 stem to apply, 0 blocked", s["F-timing"]?.apply === 18 && s["F-spelling"]?.apply === 26 && s["F-stem"]?.apply === 1 && !s["F-timing"]?.blocked && !s["F-spelling"]?.blocked && !s["F-stem"]?.blocked, JSON.stringify([s["F-timing"], s["F-spelling"], s["F-stem"]]));
check("a second run changes nothing (every change 'already')", (() => { const s2 = summarize(after.flatMap((r) => planRow(r, inp).changes)); return Object.values(s2).every((x) => x.apply === 0 && x.blocked === 0); })());

// 3 · a Part C "now" mismatch blocks that question only
none("a Part C now-mismatch blocks that question only (the rest of the row applies)", mismatchProblems(exportRows, inp, { id: "cmr2p0o4m0007hsbz4603uc7j", q: "q2" }));

// 4 · keys balanced, no key text changes; full tests official shape; paragraph A–E
none("keys: no key text changes, 4 options, balanced (20–30 % each) in Part C and in the full tests", keyProblems(inp, de));
none("every full test: 38 questions, Listening 8/5/6/5/8/6, Reading 11/8/9/10 with 5/3/0/5 blanks, every blank's key among its options", fullTestShapeProblems(de, manifest));
check("every paragraph answer is A–E", de.tests.flatMap((t) => t.parts.flatMap((p) => p.questions.filter((q) => q.type === "paragraph"))).every((q) => /^[A-E]$/.test(q.answer)));

// 5 · model answers: every live Writing/Speaking item has them (by id), and the app's file is exactly the conversion of the input
const ws = after.filter((r) => r.active !== false && (r.subTest === "WRITING" || r.subTest === "SPEAKING"));
const missingModels = ws.filter((r) => !modelAnswersFor(r.taskType, r.title, r.id));
check(`every live Writing/Speaking item has model answers (${ws.length - missingModels.length} of ${ws.length})`, missingModels.length === 0 && ws.length === 107, missingModels.map((r) => r.title).join("; "));
check("…also by taskType + final title (a database seeded from the seed source has other ids)", ws.every((r) => modelAnswersFor(r.taskType, r.title)));
{
  const lv = (r: { taskType: string; title: string; id: string }) => modelAnswersFor(r.taskType, r.title, r.id)!.answers.map((a) => a.level).join(",");
  const off = ws.filter((r) => !PACK1_TOP_ONLY.includes(r.id) && lv(r) !== (r.subTest === "WRITING" ? "10+,8,5" : "10+,7"));
  check("Writing items show CELPIP 10+, 8 and 5; Speaking items 10+ and 7", off.length === 0, off.map((r) => `${r.title}: ${lv(r)}`).slice(0, 3).join("; "));
  check(`no Speaking item is left with one level (exceptions: ${PACK1_TOP_ONLY.length})`, PACK1_TOP_ONLY.length === 0 && ws.filter((r) => r.subTest === "SPEAKING").every((r) => lv(r) === "10+,7"));
  // addendum v1: Pack 1 Task 5's answers are replaced (camping against the COTTAGE); Tasks 2, 6, 7, 8 keep their own 10+ and gain a 7
  const pack1 = (JSON.parse(readFileSync("src/content/factory/celpip-model-answers.json", "utf8")) as { items: { taskType: string; title: string; answers: { level: string; text: string }[] }[] }).items;
  const t5 = after.find((r) => r.id === ADDENDUM_PACK1.task5)!, m5 = modelAnswersFor(t5.taskType, t5.title, t5.id)!;
  check("addendum: Task 5's 10+ and 7 argue camping against the cottage; the old answer against the hotel is gone (by id and by title)", m5.answers.every((a) => /cottage/.test(a.text) && !/hotel package is fourteen hundred/.test(a.text)) && modelAnswersFor(t5.taskType, t5.title)!.answers.every((a) => /cottage/.test(a.text)));
  const kept = ADDENDUM_PACK1.gained7.every((id) => {
    const r = after.find((x) => x.id === id)!, m = modelAnswersFor(r.taskType, r.title, r.id)!;
    const own = pack1.find((p) => p.taskType === r.taskType && p.title === r.title)!.answers.find((a) => a.level === "10+")!;
    return m.answers.length === 2 && m.answers[0].text === own.text && m.answers[1].level === "7" && m.answers[1].label === "Level 7";
  });
  check("addendum: Pack 1 Tasks 2, 6, 7, 8 keep their own 10+ word for word and gain a CELPIP 7", kept);
}
{
  const ab = summarize([...bank.rows.flatMap((r) => r.changes), ...bank.missing]).ADD;
  check("addendum: Pack 1 Task 5 two screens to apply, 0 blocked", ab?.apply === 1 && !ab?.blocked, JSON.stringify(ab));
  const p = after.find((r) => r.id === ADDENDUM_PACK1.task5)!.payload as Record<string, unknown>;
  check("…after the write: 60 s choose, 60 prep, 60 speak, and the cottage as the third option on screen 2", p.chooseSeconds === 60 && p.prepSeconds === 60 && p.speakSeconds === 60 && String(p.part2).includes(String(p.thirdOption)) && /cottage/.test(String(p.thirdOption)) && /A, a camping trip/.test(String(p.part1)) && /B, a city hotel/.test(String(p.part1)));
  const row = exportRows.find((r) => r.id === ADDENDUM_PACK1.task5)!, drift = JSON.parse(JSON.stringify(row)); drift.payload.prepSeconds = 90;
  check("…and a live row that is no longer the old one is blocked, not changed", planRow(drift, inp).changes.find((c) => c.part === "ADD")?.status === "blocked" && canon(planRow(drift, inp).next.payload) === canon(drift.payload));
  const L4 = de.tests.filter((t) => t.skill === "L")[3].parts[0], s3 = L4.texts.find((x) => x.kind === "SECTION 3")!.text;
  check("addendum: Listening Test 4 Part 1 Section 3 has Kenji's new line (once), not the old one; question 7's Why follows it", s3.includes("Kenji: We have to move out of our current place on the thirty-first") && !/lease ends/.test(s3) && /move out of our current place/.test(L4.questions[6].why) && L4.questions[6].answer === "c");
  const raw = JSON.parse(readFileSync("src/content/factory/rr418/DE_full_tests.json", "utf8")) as DeData;
  check("…while DE_full_tests.json itself is unchanged (the addendum is applied in memory)", /lease ends/.test(raw.tests.filter((t) => t.skill === "L")[3].parts[0].texts[2].text));
}
check("the app's model-answer file is exactly the conversion of AB_model_answers.json (no drift)", readFileSync(MODEL_FILE, "utf8") === buildModelFile());

// 6 · "Why"
const html = (t: unknown) => renderToStaticMarkup(createElement(WhyBox, { text: t as string }));
check('"Why" renders when the question has an explanation', /Why/.test(html("Greg says the water drains.")) && html("x").includes("data-why"));
check('"Why" renders nothing when there is no text (empty, blank, missing)', html("") === "" && html("   ") === "" && html(null) === "" && html(undefined) === "");
{
  const part = fullTestItems(de, manifest).find((x) => x.taskType === "READING_CORRESPONDENCE")!;
  const rv = buildObjectiveReview("READING_CORRESPONDENCE", part.payload, { answers: {} })!;
  check("the review carries each question's Why (all 11 of a full Reading Part 1)", rv.rows.length === 11 && rv.rows.every((r) => r.why));
  const bare = buildObjectiveReview("READING_CORRESPONDENCE", { passages: [], questions: [{ id: "q1", kind: "mcq", stem: "s", options: [{ id: "a", text: "x" }], answer: "a", explanation: "  " }] }, { answers: { q1: "a" } })!;
  check("…and none for a question without one", bare.rows[0].why === null && whyOf({}) === null);
}

// 7 · Task 5 two screens; every timing equals the official table
none("every live Speaking timing equals the official table; Task 5 is two screens", timingProblems(after));
check(`no live Speaking item is excused from the official timing table (exceptions: ${Object.keys(TIMING_NOT_FIXED).length})`, Object.keys(TIMING_NOT_FIXED).length === 0);

// 8 · audio: every clip from THIS script and heard; a failing clip leaves its part inactive
const clips = clipsOf(de);
check(`the manifest has all ${clips.length} clips`, !!manifest && clips.every((c) => manifest.clips[c.key]), manifest ? clips.filter((c) => !manifest.clips[c.key]).map((c) => c.key).join(",") : "no manifest");
if (manifest) {
  const files = clips.filter((c) => existsSync(c.file) && createHash("sha256").update(readFileSync(c.file)).digest("hex") === manifest.clips[c.key]?.sha256);
  check("every clip file is the one the manifest names (sha256)", files.length === clips.length, `${files.length}/${clips.length}`);
  check("every clip was rendered from its frozen script (script sha256)", clips.every((c) => manifest.clips[c.key]?.scriptSha === sha(c.text)));
  const tr = JSON.parse(readFileSync(TRANSCRIPTS_FILE, "utf8")) as { model: string; clips: Record<string, string> };
  const again = listenResults(de, tr.clips, tr.model);
  check("the listen check re-run from the transcripts gives the manifest's result for every clip", clips.every((c) => JSON.stringify(again[c.key]) === JSON.stringify(manifest.clips[c.key]?.listen)));
  const items = fullTestItems(de, manifest).filter((x) => x.subTest === "LISTENING");
  const inactive = items.filter((x) => !x.active);
  console.log(`       listen check: ${clips.filter((c) => clipOk(c, manifest).ok).length}/${clips.length} clips pass; Listening parts active ${items.length - inactive.length}/${items.length}${inactive.length ? ` (inactive: ${inactive.map((x) => x.title.split(" — ")[0]).join("; ")})` : ""}`);
  const broken: Manifest = JSON.parse(JSON.stringify(manifest)); broken.clips["L2-P3"].listen = { ...broken.clips["L2-P3"].listen!, ok: false, misses: ["sabotage"] };
  const b = fullTestItems(de, broken).find((x) => (x.payload.fullTest as { test: string; part: number }).test === "L2" && (x.payload.fullTest as { part: number }).part === 3)!;
  check("a Listening part whose clip fails the listen check is stored INACTIVE (and only that part changes)", b.active === false && fullTestItems(de, broken).filter((x) => x.title !== b.title).every((x, i, arr) => x.active === fullTestItems(de, manifest).filter((y) => y.title !== b.title)[i].active && arr.length > 0));
  const other: Manifest = JSON.parse(JSON.stringify(manifest)); other.clips["L1-P2"].scriptSha = sha("another script");
  check("a clip rendered from a different script is not accepted (and its part is inactive)", !clipOk(clips.find((c) => c.key === "L1-P2")!, other).ok && fullTestItems(de, other).find((x) => x.title.startsWith("Full Listening Test 1 · Part 2"))!.active === false);
}

// 9 · the seed: the same changes, no duplicates, nothing on a preview
const seed = seedWithRr418();
const ss = summarize(seed.changes);
check("the seed source gets the same changes (C 286, B 21, F 45), none blocked, none unmatched", ss.C?.apply === 286 && ss.B?.apply === 21 && (ss["F-timing"]?.apply ?? 0) + (ss["F-spelling"]?.apply ?? 0) + (ss["F-stem"]?.apply ?? 0) === 45 && seed.unmatched.length === 0 && Object.values(ss).every((x) => !x.blocked), JSON.stringify(ss));
{
  const idByKey = new Map(exportRows.map((r) => [keyOf(r.taskType, r.title), r.id]));
  const afterById = new Map(after.map((r) => [r.id, r]));
  const pairs = SOURCE.map((src, i) => ({ src, out: seed.items[i], r: afterById.get(idByKey.get(keyOf(String(src.taskType), src.title)) ?? "") }));
  const diffs = pairs.filter((x) => x.r && (canon(x.r.payload) !== canon(x.out.payload) || x.r.title !== x.out.title));
  check(`a re-seed gives the same items as production after the write (title + payload, ${pairs.filter((x) => x.r).length} items)`, diffs.length === 0, diffs.map((d) => d.src.title).slice(0, 3).join("; "));
}
check("the committed seed overrides are exactly the plan's output (no drift)", readFileSync(OVERRIDES_FILE, "utf8") === buildOverrides());
check("seed:prod's own items (the five files + the overrides) equal the planned seed, item by item", canon(seedItems()) === canon(seed.items));
const before = presentKeys(exportRows, renames(inp)), afterKeys = presentKeys(after, renames(inp));
check("seed:prod before the owner's write inserts nothing (renamed items count under their old title)", seed.items.every((it) => before.has(keyOf(String(it.taskType), it.title))), seed.items.filter((it) => !before.has(keyOf(String(it.taskType), it.title))).map((i) => i.title).join("; "));
check("seed:prod after the owner's write inserts nothing", seed.items.every((it) => afterKeys.has(keyOf(String(it.taskType), it.title))));
check("seed:prod never creates the full tests (only the owner's write does)", !seed.items.some((it) => it.topicTag === "full-test"));
check("seed:prod does nothing on a Vercel preview build", seedSkipReason({ VERCEL_ENV: "preview" } as unknown as NodeJS.ProcessEnv) !== null && seedSkipReason({ VERCEL_ENV: "production" } as unknown as NodeJS.ProcessEnv) === null && seedSkipReason({} as unknown as NodeJS.ProcessEnv) === null);

// 10 · what crosses to the browser, and the new question types' marking
{
  const items = fullTestItems(de, manifest);
  const L1 = items.find((x) => x.taskType === "LISTENING_PROBLEM_SOLVING")!, R3 = items.find((x) => x.taskType === "READING_INFORMATION")!, R1 = items.find((x) => x.taskType === "READING_CORRESPONDENCE")!;
  // a quote-free piece of the Why (a stringified payload escapes quotes, so a piece with one could never be found: a vacuous search)
  const needle = (L1.payload.questions as { explanation: string }[])[0].explanation.split(/["\\]/).sort((a, b) => b.length - a.length)[0].slice(0, 30), script = String(L1.payload.audioScript).slice(0, 40);
  check("control: the stored Listening part holds its script and its Why", JSON.stringify(L1.payload).includes(needle) && JSON.stringify(L1.payload).includes(script));
  const outL = JSON.stringify(sanitizePayload("LISTENING_PROBLEM_SOLVING", L1.payload));
  check("the browser gets neither the script, the keys nor the Why of a Listening part — but does get its 3 sections", !outL.includes(needle) && !outL.includes(script) && !/"answer"/.test(outL) && (JSON.parse(outL).sections ?? []).length === 3);
  const outR = JSON.stringify(sanitizePayload("READING_CORRESPONDENCE", R1.payload));
  check("the browser gets no Reading key or Why, but the blanks' numbers and texts", !/"answer"|"explanation"/.test(outR) && JSON.parse(outR).questions.filter((q: { kind?: string; blank?: number }) => q.kind === "blank" && q.blank).length === 5);
  const p3 = readingPayloadSchema.parse(R3.payload), keys = Object.fromEntries(p3.questions.map((q) => [q.id, q.answer]));
  check("paragraph questions mark by letter: all right 9/9", scoreReading(p3, { answers: keys }).pointsEarned === 9);
  check("…a wrong letter and a malformed answer score 0", scoreReading(p3, { answers: { q1: keys.q1 === "A" ? "B" : "A", q2: "paragraph b", q3: "" } }).pointsEarned === 0 + 0 + 0);
  const p1 = readingPayloadSchema.parse(R1.payload), k1 = Object.fromEntries(p1.questions.map((q) => [q.id, q.answer]));
  check("blanks mark by option id: all right 11/11, one blank wrong 10/11", scoreReading(p1, { answers: k1 }).pointsEarned === 11 && scoreReading(p1, { answers: { ...k1, q7: k1.q7 === "a" ? "b" : "a" } }).pointsEarned === 10);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
