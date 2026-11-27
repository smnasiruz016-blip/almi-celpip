// RR-418 addendum v1 (beta-g, 27 Nov 2026: C:\Projects\_handoffs\RR-418_addendum_v1.md) · overrides on top of the md5-checked inputs.
// The inputs keep their md5; every override here is applied in memory, each only when the text it was written against ("now") is there.
//   1. Listening Test 4, Part 1, Section 3: Kenji's line and question 7's "Why" (the clip is re-rendered from the new line).
//   2. Pack 1 Speaking Task 5 (celpip-p1-speaking-5, a live row): the real two screens, a third option, 60/60/60, new model answers.
//   3. Pack 1 Speaking 2, 5, 6, 7, 8: CELPIP 7 model answers.
// Pure: no database, no file system, no network (the JSON is passed in, or imported by the caller).
import type { DeData } from "./full-tests";
import type { ModelAnswer } from "../import";

export type AddListening = { test: string; part: string; section: string; lineNow: string; lineNew: string; question: number; whyNow: string; whyNew: string };
export type AddSpeaking = {
  id: string; packItem: string; taskType: string; title: string;
  now: { taskPrompt: string; prepSeconds: number; speakSeconds: number };
  new: { taskPrompt: string; part1: string; part2: string; thirdOption: string; chooseSeconds: number; prepSeconds: number; speakSeconds: number };
};
export type AddLevel = { level: "10+" | "7"; text: string; aside: string | null; notes: string[] };
export type AddModel = { packItem: string; replace: boolean; levels: AddLevel[] };
export type Addendum = { schema: 1; source: string; listening: AddListening[]; speaking: AddSpeaking[]; modelAnswers: AddModel[] };

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** DE with the addendum's Listening changes. Throws when a "now" is not found exactly once: the frozen script is never guessed at. */
export function withAddendumDe(de: DeData, add: Addendum): DeData {
  const out = clone(de);
  for (const a of add.listening) {
    const skill = a.test[0] as "L" | "R", n = Number(a.test.slice(1));
    const t = out.tests.filter((x) => x.skill === skill)[n - 1];
    const p = t?.parts.find((x) => x.part === a.part);
    const s = p?.texts.find((x) => x.kind === a.section);
    if (!p || !s) throw new Error(`addendum: ${a.test} ${a.part} ${a.section} is not in the full tests`);
    const hits = s.text.split("\n").filter((l) => l.trim() === a.lineNow).length;
    if (hits !== 1 && !s.text.includes(a.lineNew)) throw new Error(`addendum: ${a.test} ${a.part} ${a.section}: the line to change stands ${hits} times (expected once)`);
    if (hits === 1) s.text = s.text.split("\n").map((l) => (l.trim() === a.lineNow ? a.lineNew : l)).join("\n");
    const q = p.questions[a.question - 1];
    if (!q || (q.why !== a.whyNow && q.why !== a.whyNew)) throw new Error(`addendum: ${a.test} ${a.part} q${a.question}: its "Why" is not the one the addendum was written against`);
    q.why = a.whyNew;
  }
  return out;
}

/** Pack 1's level labels ("Level 10+", "Level 7"), so an item's answers read the same as the rest of Pack 1 */
const LABEL = { "10+": { label: "Level 10+", tier: "top" }, "7": { label: "Level 7", tier: "middle" } } as const;
const noteOf = (n: string) => { const m = /^\*\*([^*:]+):\*\*\s*([\s\S]*)$/.exec(n.trim()); return m ? { criterion: m[1].trim(), text: m[2].trim() } : { criterion: "Notes", text: n.trim() }; };
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function addendumAnswer(l: AddLevel): ModelAnswer {
  const paragraphs = l.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return { level: l.level, label: LABEL[l.level].label, tier: LABEL[l.level].tier, text: l.text, paragraphs, wordCount: words(l.text), notes: l.notes.map(noteOf), aside: l.aside, withMistakes: false } as ModelAnswer;
}

/** a Pack 1 item's answers after the addendum: replaced, or its own answers plus the new levels, ordered 10+ then 7 */
export function mergeAnswers(own: ModelAnswer[], m: AddModel): ModelAnswer[] {
  const add = m.levels.map(addendumAnswer);
  const kept = m.replace ? [] : own.filter((a) => !add.some((b) => b.level === a.level));
  const order = ["10+", "8", "7", "5"];
  return [...kept, ...add].sort((a, b) => order.indexOf(String(a.level)) - order.indexOf(String(b.level)));
}
