// RR-418 · ONE implementation of every change to an existing item (Parts B, C and F), used by:
//   - the owner's write (scripts/factory/rr418/apply-rr418.ts), on the live rows;
//   - the seed (scripts/seed/all.ts → seed:prod), on the seed source, so a re-seed gives the same bank;
//   - the tests.
// Every change is applied ONLY when the row still holds what the change was written against ("now"); otherwise that one change is
// BLOCKED, with its reason, and the rest of the row still goes ahead. A change already in place is "already" (a second run changes nothing).
//   Part C   a live Listening/Reading question: 4 options, the new key, the explanation ("Why"), only when the live options equal
//            oldOptions and the live key equals oldAnswer. The key's TEXT never changes, only its position (else: a data error, blocked).
//   Part B   21 Speaking prompt fixes (the "now" is the owner's export of 27 Nov 2026): Task 5 becomes two screens, Task 6 shows its two
//            options, 5 items get a new title.
//   Part F   18 timings, 26 spellings, 1 Reading stem — each with its own "now".
//   ADD      addendum v1: Pack 1 Speaking Task 5 (Camping trip or city hotel) becomes the real two screens with a third option, 60/60/60.
// Pure: no database, no file system, no network.
import type { Addendum } from "./addendum";

export type Option = { id: string; text: string };
export type LiveRow = {
  id: string;
  subTest: string;
  taskType: string;
  title: string;
  prompt: string;
  payload: unknown;
  guidanceNote?: string | null;
  active?: boolean;
};

export type AbLevel = { level: string; heading: string; text: string; notes: string[]; words: number };
export type AbData = { items: Record<string, { title: string; source: string; levels: AbLevel[]; promptFix?: string }> };
export type CQuestion = { stem: string; options: Option[]; answer: string; explanation: string; oldAnswer: string; oldOptions: string[] };
export type CData = { items: Record<string, Record<string, CQuestion>> };
export type FTiming = { id: string; title: string; now: { prepSeconds: number; speakSeconds: number }; new: { chooseSeconds?: number; prepSeconds: number; speakSeconds: number; note?: string } };
export type FData = {
  timing: FTiming[];
  spelling: { id: string; title: string; now: string; new: string }[];
  reading_stem: { id: string; q: string; now: string; new: string }[];
};
/** what each fixed prompt was written against: the owner's read-only export (title + taskPrompt per item id) */
export type PromptNow = Record<string, { taskType: string; title: string; taskPrompt: string }>;
export type Inputs = { ab: AbData; c: CData; f: FData; promptNow: PromptNow; add?: Addendum };

/** "ADD": addendum v1 (beta-g, 27 Nov 2026) — Pack 1 Speaking Task 5 in the real two screens, only when the live row is still the old one */
export type Part = "B" | "C" | "F-timing" | "F-spelling" | "F-stem" | "ADD";
export type Status = "apply" | "already" | "blocked";
export type Change = { part: Part; id: string; title: string; what: string; status: Status; reason?: string };

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const plain = (s: string) => s.replace(/\*\*/g, "").trim();
const sameJson = (a: unknown, b: unknown) => canon(a) === canon(b);
/** key-order-free JSON (jsonb reorders keys: compare by CONTENT) */
export function canon(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canon).join(",")}]`;
  if (x && typeof x === "object") return `{${Object.keys(x as object).sort().map((k) => `${JSON.stringify(k)}:${canon((x as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(x);
}

// ───────────────────────── Part B: the fixed Speaking prompts ─────────────────────────
export type PromptFix = { title: string | null; taskPrompt: string; part1?: string; part2?: string; thirdOption?: string };

/** the factory's promptFix text → what the row should say. Throws on a shape it does not know (never guesses). */
export function parsePromptFix(taskType: string, fix: string): PromptFix {
  const nt = /\*\*New title:\*\*\s*(.+)/.exec(fix), np = /\*\*New prompt:\*\*\s*([\s\S]+)/.exec(fix);
  if (nt || np) {
    if (!nt || !np) throw new Error("a rename fix needs both New title and New prompt");
    return { title: plain(nt[1]), taskPrompt: plain(np[1].split(/\n-\s/)[0]) };
  }
  if (taskType === "SPEAKING_COMPARE_PERSUADE") {
    const m = /^Part 1\s+—\s+([\s\S]+?)\s+Part 2\s+—\s+([\s\S]+)$/.exec(fix.trim());
    const third = /\*\*([^*]+)\*\*/.exec(fix);
    if (!m || !third) throw new Error("a Task 5 fix needs 'Part 1 — …', 'Part 2 — …' and a **third option**");
    return { title: null, taskPrompt: plain(fix), part1: plain(m[1]), part2: plain(m[2]), thirdOption: third[1].trim() };
  }
  return { title: null, taskPrompt: plain(fix) };
}

// ───────────────────────── the plan for one row ─────────────────────────
type Q = { id: string; stem: string; options?: Option[]; answer: string; explanation?: string; kind?: string };

export function planRow(row: LiveRow, inp: Inputs): { next: LiveRow; changes: Change[] } {
  const next: LiveRow = clone(row);
  const payload = (next.payload ?? {}) as Record<string, unknown>;
  next.payload = payload;
  const changes: Change[] = [];
  const add = (part: Part, what: string, status: Status, reason?: string) => changes.push({ part, id: row.id, title: row.title, what, status, ...(reason ? { reason } : {}) });

  // Part C
  const cq = inp.c.items[row.id];
  if (cq) {
    const qs = (payload.questions as Q[] | undefined) ?? [];
    for (const [qid, c] of Object.entries(cq)) {
      const q = qs.find((x) => x.id === qid);
      const what = `${qid}`;
      if (!q) { add("C", what, "blocked", "the question is not in the row"); continue; }
      const liveTexts = (q.options ?? []).map((o) => o.text);
      const keyOld = c.oldOptions[["a", "b", "c", "d"].indexOf(c.oldAnswer)];
      const keyNew = c.options.find((o) => o.id === c.answer)?.text;
      if (keyOld === undefined || keyNew !== keyOld) { add("C", what, "blocked", `data error: the key's text would change ("${keyOld}" → "${keyNew}")`); continue; }
      if (c.options.length !== 4 || new Set(c.options.map((o) => o.id)).size !== 4) { add("C", what, "blocked", "data error: the fix does not have 4 distinct options"); continue; }
      if (sameJson(q.options, c.options) && q.answer === c.answer && (q.explanation ?? "") === c.explanation) { add("C", what, "already"); continue; }
      if (!sameJson(liveTexts, c.oldOptions) || q.answer !== c.oldAnswer) {
        add("C", what, "blocked", `now differs: live ${JSON.stringify(liveTexts)} key ${q.answer}; expected ${JSON.stringify(c.oldOptions)} key ${c.oldAnswer}`);
        continue;
      }
      q.options = clone(c.options); q.answer = c.answer; q.explanation = c.explanation;
      add("C", what, "apply");
    }
  }

  // Part B
  const pf = inp.ab.items[row.id]?.promptFix;
  if (pf) {
    const now = inp.promptNow[row.id];
    let fix: PromptFix | null = null;
    try { fix = parsePromptFix(row.taskType, pf); } catch (e) { add("B", "prompt", "blocked", `data error: ${(e as Error).message}`); }
    if (fix) {
      const want = { title: fix.title ?? now?.title ?? row.title, taskPrompt: fix.taskPrompt, part1: fix.part1, part2: fix.part2, thirdOption: fix.thirdOption };
      const isDone = row.title === want.title && payload.taskPrompt === want.taskPrompt && (fix.part1 === undefined || (payload.part1 === fix.part1 && payload.part2 === fix.part2 && payload.thirdOption === fix.thirdOption));
      if (isDone) add("B", "prompt", "already");
      else if (!now) add("B", "prompt", "blocked", "no 'now' for this item in the export");
      else if (row.title !== now.title || payload.taskPrompt !== now.taskPrompt) add("B", "prompt", "blocked", "now differs: the live title or taskPrompt is not the one the fix was written against");
      else {
        next.title = want.title; payload.taskPrompt = want.taskPrompt;
        if (fix.part1 !== undefined) { payload.part1 = fix.part1; payload.part2 = fix.part2; payload.thirdOption = fix.thirdOption; }
        add("B", fix.title ? `prompt + new title "${fix.title}"` : "prompt", "apply");
      }
    }
  }

  // addendum v1: Pack 1 Task 5 — the whole payload's prompt and timing, only when title, prompt and timing are still the old ones
  for (const a of inp.add?.speaking.filter((x) => x.id === row.id) ?? []) {
    const what = `Task 5 two screens (third option "${a.new.thirdOption}"), ${a.new.chooseSeconds} choose + ${a.new.prepSeconds}/${a.new.speakSeconds}`;
    const want = a.new as unknown as Record<string, unknown>;
    const isDone = row.title === a.title && Object.keys(want).every((k) => payload[k] === want[k]);
    if (isDone) add("ADD", what, "already");
    else if (row.title !== a.title || row.taskType !== a.taskType) add("ADD", what, "blocked", "now differs: the live title or task type is not the one the addendum was written against");
    else if (payload.taskPrompt !== a.now.taskPrompt || payload.prepSeconds !== a.now.prepSeconds || payload.speakSeconds !== a.now.speakSeconds) add("ADD", what, "blocked", `now differs: live ${payload.prepSeconds}/${payload.speakSeconds} or its taskPrompt is not the old one`);
    else { Object.assign(payload, clone(a.new)); add("ADD", what, "apply"); }
  }

  // Part F: timings
  for (const t of inp.f.timing.filter((x) => x.id === row.id)) {
    const want = { prepSeconds: t.new.prepSeconds, speakSeconds: t.new.speakSeconds, ...(t.new.chooseSeconds !== undefined ? { chooseSeconds: t.new.chooseSeconds } : {}) };
    const live = { prepSeconds: payload.prepSeconds, speakSeconds: payload.speakSeconds, ...(t.new.chooseSeconds !== undefined ? { chooseSeconds: payload.chooseSeconds } : {}) };
    const what = `timing ${t.now.prepSeconds}/${t.now.speakSeconds} → ${t.new.chooseSeconds ? `${t.new.chooseSeconds} choose + ` : ""}${t.new.prepSeconds}/${t.new.speakSeconds}`;
    if (sameJson(live, want)) add("F-timing", what, "already");
    else if (payload.prepSeconds !== t.now.prepSeconds || payload.speakSeconds !== t.now.speakSeconds) add("F-timing", what, "blocked", `now differs: live ${payload.prepSeconds}/${payload.speakSeconds}`);
    else { Object.assign(payload, want); add("F-timing", what, "apply"); }
  }

  // Part F: spelling — the "now" word must stand exactly once (as a whole word) in the row's own text fields
  for (const s of inp.f.spelling.filter((x) => x.id === row.id)) {
    const re = new RegExp(`\\b${s.now}\\b`, "g"), reNew = new RegExp(`\\b${s.new}\\b`);
    const fields: [Record<string, unknown>, string][] = [];
    for (const k of ["title", "prompt", "guidanceNote"]) if (typeof (next as Record<string, unknown>)[k] === "string") fields.push([next as unknown as Record<string, unknown>, k]);
    for (const k of Object.keys(payload)) if (typeof payload[k] === "string") fields.push([payload, k]);
    const hits = fields.map(([o, k]) => ({ o, k, n: (String(o[k]).match(re) ?? []).length })).filter((h) => h.n > 0);
    const n = hits.reduce((a, h) => a + h.n, 0);
    const what = `spelling ${s.now} → ${s.new}`;
    if (n === 0) {
      if (fields.some(([o, k]) => reNew.test(String(o[k])))) add("F-spelling", what, "already");
      else add("F-spelling", what, "blocked", `now differs: "${s.now}" is not in the row`);
    } else if (n > 1) add("F-spelling", what, "blocked", `now differs: "${s.now}" stands ${n} times (expected once)`);
    else { const h = hits[0]; h.o[h.k] = String(h.o[h.k]).replace(re, s.new); add("F-spelling", what, "apply"); }
  }

  // Part F: the one Reading stem
  for (const s of inp.f.reading_stem.filter((x) => x.id === row.id)) {
    const q = ((payload.questions as Q[] | undefined) ?? []).find((x) => x.id === s.q);
    const what = `${s.q} stem`;
    if (!q) add("F-stem", what, "blocked", "the question is not in the row");
    else if (q.stem === s.new) add("F-stem", what, "already");
    else if (q.stem !== s.now) add("F-stem", what, "blocked", "now differs: the live stem is not the one the fix was written against");
    else { q.stem = s.new; add("F-stem", what, "apply"); }
  }

  return { next, changes };
}

/** every item id a part names, so a whole-bank plan can report a change whose row is missing from the bank */
export function namedIds(inp: Inputs): Record<Part, string[]> {
  return {
    B: Object.entries(inp.ab.items).filter(([, v]) => v.promptFix).map(([id]) => id),
    C: Object.keys(inp.c.items),
    "F-timing": inp.f.timing.map((t) => t.id),
    "F-spelling": [...new Set(inp.f.spelling.map((t) => t.id))],
    "F-stem": inp.f.reading_stem.map((t) => t.id),
    ADD: (inp.add?.speaking ?? []).map((a) => a.id),
  };
}

/** the whole bank: one plan per row, plus a BLOCKED line for every named item that is not in the bank at all */
export function planBank(rows: LiveRow[], inp: Inputs): { rows: { before: LiveRow; next: LiveRow; changes: Change[] }[]; missing: Change[] } {
  const byId = new Set(rows.map((r) => r.id));
  const out = rows.map((r) => ({ before: r, ...planRow(r, inp) }));
  const missing: Change[] = [];
  for (const [part, ids] of Object.entries(namedIds(inp)) as [Part, string[]][]) for (const id of ids) if (!byId.has(id)) missing.push({ part, id, title: inp.promptNow[id]?.title ?? "", what: "row", status: "blocked", reason: "the item is not in the bank" });
  return { rows: out, missing };
}

/** the items renamed by Part B: an old (taskType, title) that already stands for the new one — seed:prod uses this so a deploy that lands
 *  BEFORE the owner's write never inserts a renamed item a second time under its new title */
export function renames(inp: Inputs): { taskType: string; from: string; to: string }[] {
  const out: { taskType: string; from: string; to: string }[] = [];
  for (const [id, v] of Object.entries(inp.ab.items)) {
    if (!v.promptFix) continue;
    const now = inp.promptNow[id];
    if (!now) continue;
    const fix = parsePromptFix(now.taskType, v.promptFix);
    if (fix.title && fix.title !== now.title) out.push({ taskType: now.taskType, from: now.title, to: fix.title });
  }
  return out;
}

export const summarize = (changes: Change[]) => {
  const by: Record<string, { apply: number; already: number; blocked: number }> = {};
  for (const c of changes) (by[c.part] ??= { apply: 0, already: 0, blocked: 0 })[c.status]++;
  return by;
};
