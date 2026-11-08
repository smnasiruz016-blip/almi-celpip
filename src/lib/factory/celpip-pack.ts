/**
 * RR-401 · the AlmiCELPIP pack parser. Reads a factory pack (.md, written and checked by beta-g) into plain data. Pure: no file
 * system, no network, no clock. It never changes a word of the pack: it only splits the text into fields.
 *
 * Pack shape (AlmiCELPIP_Pack1.md):
 *   # Email N — <title>     > **situation … Write an email … In your email:**  > - point;   ## CELPIP 10+|8|5 model answer
 *   # Survey N — <title>    > **question**  > - **Option A:** …  > - **Option B:** …         ## CELPIP 10+|8|5 model answer
 *   # Task N — <title> (<timing>)   > **prompt** *(Scene for the image: …)* | *(Details: …)* | *(Model: …)*
 *                                   **Level 10+ model (about N words):** … **Notes:** …   **Level 7 sample (about N words):** …
 *   ## Word counts (written answers)   | Item | Level | Words |
 */

export type Kind = "email" | "survey" | "speaking";
export type Level = "10+" | "8" | "7" | "5";
/** top and middle levels are grammar-checked; the low level carries mistakes on purpose */
export type Tier = "top" | "middle" | "low";
export const tierOf = (level: Level): Tier => (level === "10+" ? "top" : level === "5" ? "low" : "middle");

export type PackNote = { criterion: string; text: string };
export type PackAnswer = { level: Level; label: string; text: string; paragraphs: string[]; notes: PackNote[]; aside: string | null; statedWords: number | null };
export type PackItem = {
  kind: Kind;
  number: number;
  /** "Email 1", "Survey 2", "Speaking Task 3": the name the word-count table uses */
  tableName: string;
  heading: string;
  /** the prompt exactly as written (markdown marks removed), one entry per blockquote line */
  promptLines: string[];
  /** email */
  situation?: string;
  instruction?: string;
  /** survey */
  topic?: string;
  optionA?: string;
  optionB?: string;
  /** speaking */
  taskPrompt?: string;
  prepSeconds?: number;
  speakSeconds?: number;
  scene?: string;
  modelContext?: string;
  answers: PackAnswer[];
};
export type WordRow = { item: string; level: Level; words: number };
export type Pack = { file: string; surveyInstruction: string | null; items: PackItem[]; wordTable: WordRow[] };

/**
 * The pack's own word rule, measured against its table (24 of 24 rows agree; no other rule tried does): a word is a run of ASCII
 * letters, digits, apostrophes, hyphens and full stops that holds a letter or a digit. So "6:30" is two words, "a.m." one,
 * "604-555-0182" one, and an accented word splits ("résumé" counts as two). Do not "fix" it: the gate is that our count EQUALS
 * the table beta-g wrote.
 */
export function countWords(text: string): number {
  return (text.match(/[A-Za-z0-9'’.-]+/g) ?? []).filter((t) => /[A-Za-z0-9]/.test(t)).length;
}

const stripBold = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, "$1");
const ITEM_RE = /^# (Email|Survey|Task) (\d+) — (.+)$/;
const W_ANSWER_RE = /^## CELPIP (10\+|8|5) model answer\s*$/;
const W_NOTES_RE = /^\*\*Notes \(CELPIP (10\+|8|5)\):\*\*\s*$/;
const NOTE_RE = /^- \*\*([^:*]+):\*\*\s*(.+)$/;
const S_ANSWER_RE = /^\*\*Level (10\+|7) (model|sample) \(about (\d+) words\):\*\*\s*$/;
const S_NOTES_RE = /^\*\*Notes(?: \(Level (?:10\+|7)\))?:\*\*\s*(.+)$/;
const ASIDE_RE = /^\*\((.+)\)\*\s*$/;
const SAME_PICTURE = "\u0000same-picture";

function paragraphsOf(lines: string[]): string[] {
  const out: string[] = [];
  let cur: string[] = [];
  for (const l of lines) {
    if (l.trim() === "") { if (cur.length) out.push(cur.join("\n")); cur = []; } else cur.push(l.trimEnd());
  }
  if (cur.length) out.push(cur.join("\n"));
  return out;
}

function timing(heading: string): { title: string; prep: number; speak: number } {
  const m = heading.match(/^(.*?) \(([^)]*)\)$/);
  if (!m) throw new Error(`speaking heading has no timing: ${heading}`);
  const n = [...m[2].matchAll(/(\d+) seconds/g)].map((x) => Number(x[1]));
  if (n.length === 2) return { title: m[1], prep: n[0], speak: n[1] };
  if (n.length === 3) return { title: m[1], prep: n[0] + n[1], speak: n[2] };
  throw new Error(`speaking timing not understood: ${heading}`);
}

export function parsePack(md: string, file: string): Pack {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const items: PackItem[] = [];
  const wordTable: WordRow[] = [];
  let surveyInstruction: string | null = null;
  let item: PackItem | null = null;
  let answer: PackAnswer | null = null;
  let body: string[] = [];
  let mode: "none" | "prompt" | "answer" | "notes" | "table" = "none";

  const closeAnswer = () => {
    if (answer && item) {
      if (mode === "answer") { answer.paragraphs = paragraphsOf(body); answer.text = answer.paragraphs.join("\n\n"); }
      item.answers.push(answer);
    }
    answer = null; body = [];
  };
  const closeItem = () => { closeAnswer(); if (item) items.push(finishPrompt(item)); item = null; };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const im = line.match(ITEM_RE);
    if (im) {
      closeItem();
      const kind: Kind = im[1] === "Email" ? "email" : im[1] === "Survey" ? "survey" : "speaking";
      const number = Number(im[2]);
      let heading = im[3];
      const it: PackItem = { kind, number, tableName: kind === "speaking" ? `Speaking Task ${number}` : `${im[1]} ${number}`, heading, promptLines: [], answers: [] };
      if (kind === "speaking") { const t = timing(heading); heading = t.title; it.heading = heading; it.prepSeconds = t.prep; it.speakSeconds = t.speak; }
      item = it; mode = "prompt";
      continue;
    }
    if (/^# Part /.test(line) || line === "---") { closeItem(); mode = "none"; continue; }
    if (/^## Word counts/.test(line)) { closeItem(); mode = "table"; continue; }
    if (mode === "none" && !item && /^\*Task: /.test(line)) { surveyInstruction = line.replace(/^\*Task: [^.]+\. /, "").replace(/\*$/, ""); continue; }
    if (mode === "table") {
      const r = line.match(/^\| (.+?) \| (?:CELPIP|Level) (10\+|8|7|5) \| (\d+)/);
      if (r) wordTable.push({ item: r[1], level: r[2] as Level, words: Number(r[3]) });
      continue;
    }
    if (!item) continue;
    const cur: PackItem = item;
    if (mode === "prompt" && line.startsWith(">")) { cur.promptLines.push(line.replace(/^>\s?/, "")); continue; }
    const wa = line.match(W_ANSWER_RE);
    const sa = line.match(S_ANSWER_RE);
    if (wa || sa) {
      closeAnswer();
      const level = (wa ? wa[1] : sa![1]) as Level;
      answer = { level, label: wa ? `CELPIP ${level}` : `Level ${level}`, text: "", paragraphs: [], notes: [], aside: null, statedWords: sa ? Number(sa[3]) : null };
      mode = "answer"; body = [];
      continue;
    }
    if (!answer) continue;
    const a: PackAnswer = answer;
    if (mode === "answer") {
      if (W_NOTES_RE.test(line)) { a.paragraphs = paragraphsOf(body); a.text = a.paragraphs.join("\n\n"); mode = "notes"; continue; }
      const sn = line.match(S_NOTES_RE);
      if (sn) { a.paragraphs = paragraphsOf(body); a.text = a.paragraphs.join("\n\n"); a.notes.push({ criterion: "Notes", text: sn[1] }); mode = "notes"; continue; }
      body.push(line);
      continue;
    }
    if (mode === "notes") {
      const n = line.match(NOTE_RE);
      if (n) { a.notes.push({ criterion: n[1].trim(), text: n[2].trim() }); continue; }
      const as = line.match(ASIDE_RE);
      if (as) { a.aside = as[1]; continue; }
    }
  }
  closeItem();
  // "the same … picture": the task uses the scene of the speaking task before it
  items.forEach((it, i) => { if (it.scene === SAME_PICTURE) it.scene = items[i - 1]?.scene ?? SAME_PICTURE; });
  return { file, surveyInstruction, items, wordTable };
}

/** split the blockquote into the product's fields, without changing a word */
function finishPrompt(it: PackItem): PackItem {
  const [first, ...rest] = it.promptLines.filter((l) => l.trim() !== "");
  if (!first) throw new Error(`${it.tableName}: no prompt`);
  if (it.kind === "email") {
    const main = stripBold(first).trim();
    const at = main.indexOf("Write an email");
    if (at < 0) throw new Error(`${it.tableName}: no "Write an email" sentence`);
    it.situation = main.slice(0, at).trim();
    it.instruction = [main.slice(at).trim(), ...rest.map((l) => stripBold(l).trim())].join("\n");
  } else if (it.kind === "survey") {
    it.topic = stripBold(first).trim();
    const opt = (k: "A" | "B") => rest.map((l) => stripBold(l).trim()).find((l) => l.startsWith(`- Option ${k}:`))?.replace(`- Option ${k}:`, "").trim();
    it.optionA = opt("A"); it.optionB = opt("B");
    if (!it.optionA || !it.optionB) throw new Error(`${it.tableName}: two options expected`);
  } else {
    const all = [first, ...rest].join(" ");
    const m = all.match(/^\*\*(.+?)\*\*\s*(?:\*\((.+)\)\*)?\s*$/);
    if (!m) throw new Error(`${it.tableName}: prompt not understood`);
    it.taskPrompt = m[1].trim();
    const extra = m[2]?.trim();
    if (extra?.startsWith("Scene for the image:")) it.scene = extra.slice("Scene for the image:".length).trim();
    else if (extra?.startsWith("Details:")) it.taskPrompt = `${it.taskPrompt} (${extra})`;
    else if (extra?.startsWith("Model:")) it.modelContext = extra.slice("Model:".length).trim();
    else if (extra) throw new Error(`${it.tableName}: unknown prompt aside "${extra}"`);
    // a task that refers to a picture ("the same farmers' market picture") needs the image too
    if (!it.scene && /\bpicture\b|\bphoto\b|\bimage\b/i.test(it.taskPrompt)) it.scene = SAME_PICTURE;
  }
  return it;
}
