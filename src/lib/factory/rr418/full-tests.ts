// RR-418 Parts D + E · the 10 full tests (DE_full_tests.json) as stored, ordered items: one CelpipItem per part, its order in the test in
// payload.fullTest, topicTag "full-test" (so practice sets and the mock never pick them). Listening Part 1 plays in 3 sections with its
// questions in between; Reading has blanks (an inline drop-down in the second text), paragraph questions (A–E, E = not given) and two
// texts per part. A Listening part whose clip has not passed the listen check is stored INACTIVE, and a test with an inactive part is not
// offered. Pure.
import { createHash } from "node:crypto";

export type DeQuestion = { type: "mcq" | "blank" | "paragraph"; stem: string; why: string; section?: string; options?: { id: string; text: string }[]; answer: string };
export type DePart = { part: string; title: string; texts: { kind: string; text: string }[]; questions: DeQuestion[]; speakers?: string };
export type DeTest = { skill: "L" | "R"; parts: DePart[] };
export type DeData = { tests: DeTest[] };

/** the official counts (celpip.ca, CELPIP-General Overview Study Pack 2026 p. 3; checked by beta-g 27 Nov 2026) */
export const OFFICIAL = Object.freeze({
  L: { parts: [8, 5, 6, 5, 8, 6], minutes: { min: 46, max: 55 } },
  R: { parts: [11, 8, 9, 10], blanks: [5, 3, 0, 5], minutes: { min: 43, max: 56 } },
});
/** the full-test timer: the LOWER end of the official window, because these tests hold only the 38 scored questions (the upper end also
 *  covers the unscored items, which a practice test does not have). Reading 11+9+10+13 = 43 min is exactly that lower end. */
export const FULL_TEST_MINUTES = Object.freeze({ L: OFFICIAL.L.minutes.min, R: OFFICIAL.R.minutes.min });

export const L_TASK = ["LISTENING_PROBLEM_SOLVING", "LISTENING_DAILY_LIFE", "LISTENING_INFORMATION", "LISTENING_NEWS", "LISTENING_DISCUSSION", "LISTENING_VIEWPOINTS"] as const;
export const R_TASK = ["READING_CORRESPONDENCE", "READING_DIAGRAM", "READING_INFORMATION", "READING_VIEWPOINTS"] as const;
export const FULL_TEST_TAG = "full-test";
export const PARAGRAPH_OPTIONS = Object.freeze([
  { id: "A", text: "Paragraph A" }, { id: "B", text: "Paragraph B" }, { id: "C", text: "Paragraph C" }, { id: "D", text: "Paragraph D" }, { id: "E", text: "Not given in any paragraph" },
]);
export const VIDEO_NOTE = "In the real test, this part plays a short video. Here you hear the audio only.";

export const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const partNo = (p: string) => Number(p.replace(/\D/g, ""));
/** CelpipItem.audioDurationSec is an Int column: whole seconds, rounded up */
const secs = (s: number | undefined) => (typeof s === "number" && s > 0 ? Math.ceil(s) : null);
export const testId = (skill: "L" | "R", n: number) => `${skill}${n}`;

// ───────────────────────── checks on the factory data ─────────────────────────
/** → [] when every test has the official shape; otherwise one line per problem */
export function fullTestProblems(de: DeData): string[] {
  const out: string[] = [];
  const n = { L: 0, R: 0 };
  for (const t of de.tests) {
    const id = testId(t.skill, ++n[t.skill]);
    const want = OFFICIAL[t.skill].parts;
    const total = t.parts.reduce((a, p) => a + p.questions.length, 0);
    if (total !== 38) out.push(`${id}: ${total} questions, not 38`);
    if (t.parts.length !== want.length) out.push(`${id}: ${t.parts.length} parts, not ${want.length}`);
    t.parts.forEach((p, i) => {
      const where = `${id} ${p.part}`;
      if (partNo(p.part) !== i + 1) out.push(`${where}: out of order`);
      if (p.questions.length !== want[i]) out.push(`${where}: ${p.questions.length} questions, not ${want[i]}`);
      if (t.skill === "R") {
        const blanks = p.questions.filter((q) => q.type === "blank");
        if (blanks.length !== OFFICIAL.R.blanks[i]) out.push(`${where}: ${blanks.length} blanks, not ${OFFICIAL.R.blanks[i]}`);
        const marks = p.texts.flatMap((x) => [...x.text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
        const nums = blanks.map((q) => Number(q.stem.replace(/\D/g, "")));
        if ([...marks].sort().join() !== [...nums].sort().join()) out.push(`${where}: the blanks [${marks}] in the text and the blank questions [${nums}] differ`);
      }
      for (const [qi, q] of p.questions.entries()) {
        const w = `${where} q${qi + 1}`;
        if (!q.why?.trim()) out.push(`${w}: no "why"`);
        if (q.type === "paragraph") { if (!/^[A-E]$/.test(q.answer)) out.push(`${w}: paragraph answer "${q.answer}" is not A–E`); continue; }
        if (q.options?.length !== 4) out.push(`${w}: ${q.options?.length ?? 0} options, not 4`);
        if (!q.options?.some((o) => o.id === q.answer)) out.push(`${w}: the key "${q.answer}" is not among its options`);
        if (q.type === "blank" && t.skill !== "R") out.push(`${w}: a blank in a Listening test`);
      }
      if (t.skill === "L") {
        const sections = p.texts.map((x) => x.kind);
        const qs = new Set(p.questions.map((q) => q.section));
        if (i === 0 && sections.join() !== "SECTION 1,SECTION 2,SECTION 3") out.push(`${where}: Part 1 must play in 3 sections`);
        for (const s of qs) if (!sections.includes(String(s))) out.push(`${where}: a question asks about "${s}", which is not a section`);
        if (!p.speakers) out.push(`${where}: no SPEAKERS line`);
      }
    });
  }
  if (n.L !== 5 || n.R !== 5) out.push(`expected 5 Listening and 5 Reading tests, found ${n.L} and ${n.R}`);
  return out;
}

// ───────────────────────── speakers and voices ─────────────────────────
export type Spk = { name: string; gender: "female" | "male"; accent: "en-CA" | "en-US"; note: string };
export type Voice = { voice: string; pitch?: string };

/** "Nadia = woman (en-CA) ; Greg = man (building manager, en-CA)" → speakers. Throws on anything it cannot read. */
export function parseSpeakers(line: string): Spk[] {
  return line.split(";").map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = /^(.+?)\s*=\s*(woman|man)\s*\(([^)]*)\)$/.exec(s);
    if (!m) throw new Error(`speaker "${s}" is not "Name = woman|man (…, en-XX)"`);
    const acc = /\b(en-CA|en-US)\b/.exec(m[3]);
    if (!acc) throw new Error(`speaker "${s}" names no en-CA or en-US accent`);
    return { name: m[1].trim(), gender: m[2] === "woman" ? "female" : "male", accent: acc[1] as Spk["accent"], note: m[3].trim() };
  });
}

/** the free Edge voices: en-CA where the SPEAKERS line says en-CA (Edge has ONE en-CA woman and ONE en-CA man), gender kept. A second
 *  en-CA speaker of the same gender in one part keeps the same en-CA voice at a lower pitch, so the two people still sound different. */
const POOL = {
  "en-CA": { female: ["en-CA-ClaraNeural"], male: ["en-CA-LiamNeural"] },
  "en-US": { female: ["en-US-JennyNeural", "en-US-AriaNeural", "en-US-EmmaNeural", "en-US-MichelleNeural"], male: ["en-US-GuyNeural", "en-US-ChristopherNeural", "en-US-AndrewNeural", "en-US-EricNeural"] },
} as const;
export const VOICE_GENDER: Record<string, Spk["gender"]> = Object.fromEntries(Object.values(POOL).flatMap((g) => [...g.female.map((v) => [v, "female"]), ...g.male.map((v) => [v, "male"])]));
export const VOICE_ACCENT = (v: string) => v.slice(0, 5);
const PITCHES = ["-12Hz", "+10Hz"];

export function voicesFor(spk: Spk[]): Record<string, Voice> {
  const used: Record<string, number> = {}, out: Record<string, Voice> = {};
  for (const s of spk) {
    const pool = POOL[s.accent][s.gender];
    const k = `${s.accent}|${s.gender}`, i = used[k] ?? 0;
    used[k] = i + 1;
    out[s.name] = i < pool.length ? { voice: pool[i] } : { voice: pool[i % pool.length], pitch: PITCHES[(i - pool.length) % PITCHES.length] };
  }
  return out;
}

/** a script → the lines each speaker says, in order. A line without a label belongs to the only speaker (a news item or a talk). */
export function scriptLines(text: string, spk: Spk[]): { speaker: string; text: string }[] {
  const names = spk.map((s) => s.name);
  return text.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = /^([^:]{1,40}):\s+([\s\S]+)$/.exec(l);
    if (m && names.includes(m[1].trim())) return { speaker: m[1].trim(), text: m[2].trim() };
    if (m && !names.includes(m[1].trim()) && /^[A-Z][\w .'-]{0,30}$/.test(m[1].trim()) && spk.length > 1) throw new Error(`the label "${m[1]}" is not in the SPEAKERS line`);
    if (spk.length === 1) return { speaker: names[0], text: m && names.includes(m[1].trim()) ? m[2].trim() : l };
    throw new Error(`a line without a speaker label in a ${spk.length}-speaker part: "${l.slice(0, 60)}"`);
  });
}

// ───────────────────────── clips ─────────────────────────
export type Clip = { key: string; test: string; part: number; section: number | null; text: string; url: string; file: string };
export type ListenResult = { ok: boolean; model: string; lines: [number, number]; facts: [number, number]; misses: string[] };
export type ManifestClip = { key: string; url: string; bytes: number; sha256: string; durationSec: number; scriptSha: string; voices: Record<string, Voice>; listen: ListenResult | null };
export type Manifest = { schema: 1; note: string; clips: Record<string, ManifestClip> };

export function clipsOf(de: DeData): Clip[] {
  const out: Clip[] = [];
  let n = 0;
  for (const t of de.tests) {
    if (t.skill !== "L") continue;
    const tid = testId("L", ++n);
    t.parts.forEach((p, i) => {
      const part = i + 1;
      if (p.texts.length > 1) p.texts.forEach((x, s) => out.push({ key: `${tid}-P${part}-S${s + 1}`, test: tid, part, section: s + 1, text: x.text, url: `/audio/rr418/${tid}-P${part}-S${s + 1}.mp3`, file: `public/audio/rr418/${tid}-P${part}-S${s + 1}.mp3` }));
      else out.push({ key: `${tid}-P${part}`, test: tid, part, section: null, text: p.texts[0].text, url: `/audio/rr418/${tid}-P${part}.mp3`, file: `public/audio/rr418/${tid}-P${part}.mp3` });
    });
  }
  return out;
}

/** a clip is good only when it was rendered from THIS script and its listen check passed */
export function clipOk(c: Clip, m: Manifest | null): { ok: boolean; why: string } {
  const e = m?.clips[c.key];
  if (!e) return { ok: false, why: "no clip rendered" };
  if (e.scriptSha !== sha(c.text)) return { ok: false, why: "the clip was rendered from a different script" };
  if (!e.listen) return { ok: false, why: "no listen check" };
  if (!e.listen.ok) return { ok: false, why: `the listen check failed (${e.listen.misses.slice(0, 2).join("; ")})` };
  return { ok: true, why: "" };
}

// ───────────────────────── the stored items ─────────────────────────
export type FullTestMeta = { test: string; skill: "L" | "R"; part: number; parts: number; title: string };
export type FullTestItem = {
  subTest: "LISTENING" | "READING"; taskType: string; title: string; prompt: string; payload: Record<string, unknown>;
  difficulty: "CORE"; topicTag: string; active: boolean; audioUrl: string | null; audioDurationSec: number | null; guidanceNote: string | null;
  audio: { ok: boolean; why: string }[];
};

const HEADING: Record<string, string> = { TEXT: "Text", REPLY: "Reply", DIAGRAM: "Diagram", EMAIL: "Email", COMMENT: "Comment" };
const headingOf = (k: string) => HEADING[k] ?? (/^PARA ([A-D])$/.test(k) ? `Paragraph ${k.slice(5)}` : k);

const L_PROMPT = [
  "Listen to a conversation in three sections. After each section, answer its questions. Each section plays once.",
  "Listen to a conversation, then answer the questions. The audio plays once.",
  "Listen to a conversation in which someone asks for information, then answer the questions. The audio plays once.",
  "Listen to a news item, then answer the questions. The audio plays once.",
  "Listen to a discussion between three people, then answer the questions. The audio plays once.",
  "Listen to someone giving their viewpoint, then answer the questions. The audio plays once.",
];
const R_PROMPT = [
  "Read the message and the reply. Answer the questions, then choose the best option for each blank in the reply.",
  "Read the diagram and the email. Answer the questions, then choose the best option for each blank in the email.",
  "Read the four paragraphs. For each statement, choose the paragraph that contains the information, or E if it is not given.",
  "Read the article and the comment. Answer the questions, then choose the best option for each blank in the comment.",
];

export function fullTestItems(de: DeData, manifest: Manifest | null): FullTestItem[] {
  const out: FullTestItem[] = [];
  const n = { L: 0, R: 0 };
  const clips = clipsOf(de);
  for (const t of de.tests) {
    const tid = testId(t.skill, ++n[t.skill]);
    const testNo = n[t.skill];
    t.parts.forEach((p, i) => {
      const part = i + 1;
      const fullTest: FullTestMeta = { test: tid, skill: t.skill, part, parts: t.parts.length, title: `Full ${t.skill === "L" ? "Listening" : "Reading"} Test ${testNo}` };
      const title = `${fullTest.title} · Part ${part} — ${p.title}`;
      if (t.skill === "L") {
        const spk = parseSpeakers(p.speakers ?? "");
        const voices = voicesFor(spk);
        const mine = clips.filter((c) => c.test === tid && c.part === part);
        const audio = mine.map((c) => clipOk(c, manifest));
        const sections = mine.length > 1 ? mine.map((c, s) => ({ id: `s${s + 1}`, label: `Section ${s + 1}`, audioUrl: c.url, audioDurationSec: secs(manifest?.clips[c.key]?.durationSec) })) : undefined;
        const questions = p.questions.map((q, qi) => ({ id: `q${qi + 1}`, stem: q.stem, options: q.options, answer: q.answer, explanation: q.why, ...(sections ? { section: `s${Number(String(q.section).replace(/\D/g, ""))}` } : {}) }));
        out.push({
          subTest: "LISTENING", taskType: L_TASK[i], title, prompt: L_PROMPT[i],
          payload: { fullTest, audioScript: p.texts.map((x) => x.text).join("\n\n"), speakers: spk.map((s) => ({ role: s.name, voice: voices[s.name].voice, ...(voices[s.name].pitch ? { pitch: voices[s.name].pitch } : {}), gender: s.gender, accent: s.accent })), questions, ...(sections ? { sections } : {}), ...(part === 5 ? { note: VIDEO_NOTE } : {}) },
          difficulty: "CORE", topicTag: FULL_TEST_TAG, active: audio.every((a) => a.ok),
          audioUrl: sections ? null : mine[0].url, audioDurationSec: sections ? null : secs(manifest?.clips[mine[0].key]?.durationSec),
          guidanceNote: null, audio,
        });
      } else {
        const passages = p.texts.map((x, k) => ({ id: `t${k + 1}`, kind: x.kind, heading: headingOf(x.kind), body: x.text }));
        const pid = (section?: string) => passages.find((x) => x.kind === section)?.id;
        const questions = p.questions.map((q, qi) => {
          const base = { id: `q${qi + 1}`, explanation: q.why };
          if (q.type === "paragraph") return { ...base, kind: "paragraph", stem: q.stem, options: [...PARAGRAPH_OPTIONS], answer: q.answer };
          if (q.type === "blank") return { ...base, kind: "blank", stem: `Blank ${Number(q.stem.replace(/\D/g, ""))}`, blank: Number(q.stem.replace(/\D/g, "")), passage: pid(q.section), options: q.options, answer: q.answer };
          return { ...base, kind: "mcq", stem: q.stem, options: q.options, answer: q.answer, ...(pid(q.section) ? { passage: pid(q.section) } : {}) };
        });
        out.push({
          subTest: "READING", taskType: R_TASK[i], title, prompt: R_PROMPT[i], payload: { fullTest, passages, questions },
          difficulty: "CORE", topicTag: FULL_TEST_TAG, active: true, audioUrl: null, audioDurationSec: null, guidanceNote: null, audio: [],
        });
      }
    });
  }
  return out;
}

/** the row as stored (no audit fields) */
export const storedRow = (x: FullTestItem) => ({ subTest: x.subTest, taskType: x.taskType, title: x.title, prompt: x.prompt, payload: x.payload, difficulty: x.difficulty, topicTag: x.topicTag, active: x.active, audioUrl: x.audioUrl, audioDurationSec: x.audioDurationSec, guidanceNote: x.guidanceNote });
