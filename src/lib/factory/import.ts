/**
 * RR-401 · the AlmiCELPIP importer core: pack + LanguageTool results → the model-answer data the app reads + the list of blocked
 * items. Pure and deterministic (no clock, no randomness, sorted output), so importing the same pack twice gives byte-identical
 * data: idempotent by construction.
 *
 * Gates, per answer:
 *   - its word count EQUALS the pack's table (no row → blocked);
 *   - every answer has its notes (writing: the four criteria; speaking: the note) — a model without notes is not shown;
 *   - top and middle answers (10+, 8, 7): LanguageTool en-CA finds no real error, and a written one is 150–200 words;
 *   - low answers (5): not grammar-checked (the mistakes are on purpose), but the Readability note must NAME them (a quoted phrase);
 *   - every note is checked, with quoted (italic) phrases exempt.
 * Per item: the prompt text is checked; an item whose prompt is blocked, or with no answer left, is not imported.
 * A scene or photo task is imported as "image-pending": the seed never writes it and the app never shows it until an image exists.
 */
import type { CelpipTaskType } from "@prisma/client";
import { countWords, tierOf, type Kind, type Level, type Pack, type PackItem, type Tier } from "./celpip-pack";
import { LANGUAGE, blockingFindings, hintCount, plainNote, type GateFinding, type LtMatch } from "./grammar-gate";

export const WRITING_CRITERIA = ["Content/Coherence", "Vocabulary", "Readability", "Task Fulfillment"] as const;
export const LEVEL_LABEL = "These levels are AlmiCELPIP estimates, not official scores.";
export const TRADEMARK_LINE = "CELPIP is a registered trademark of Paragon Testing Enterprises. AlmiCELPIP is not affiliated with Paragon.";
export const WORD_MIN = 150;
export const WORD_MAX = 200;

export type Lt = (text: string, lang: typeof LANGUAGE) => LtMatch[];

/** the product's task type for each pack item: all of these already exist in the enum (no schema change) */
const SPEAKING_TYPE: Record<number, CelpipTaskType> = {
  1: "SPEAKING_ADVICE", 2: "SPEAKING_PERSONAL_EXPERIENCE", 3: "SPEAKING_DESCRIBE_SCENE", 4: "SPEAKING_PREDICTIONS",
  5: "SPEAKING_COMPARE_PERSUADE", 6: "SPEAKING_DIFFICULT_SITUATION", 7: "SPEAKING_OPINIONS", 8: "SPEAKING_UNUSUAL_SITUATION",
};
export const taskTypeOf = (kind: Kind, n: number): CelpipTaskType => (kind === "email" ? "WRITING_EMAIL" : kind === "survey" ? "WRITING_SURVEY" : SPEAKING_TYPE[n]);

/** product titles (the dedupe key is taskType + title); unique against every title in the existing seed (a test proves it) */
export const TITLES: Record<string, string> = {
  "Email 1": "Email — Early-morning construction noise (bylaw office)",
  "Email 2": "Email — Thanking a colleague before you change teams",
  "Email 3": "Email — Wrong size and colour in a jacket order",
  "Survey 1": "Survey — A new pool vs. a bigger library",
  "Survey 2": "Survey — Four 10-hour days vs. five days with Fridays at home",
  "Speaking Task 1": "Giving Advice — A friend starting an accounting career in Canada",
  "Speaking Task 2": "Personal Experience — Learning something new in three days",
  "Speaking Task 3": "Describe a Scene — A farmers' market with a street musician",
  "Speaking Task 4": "Making Predictions — The farmers' market with a street musician",
  "Speaking Task 5": "Compare and Persuade — Camping trip or city hotel",
  "Speaking Task 6": "Difficult Situation — Moving day or an extra shift",
  "Speaking Task 7": "Expressing Opinions — Music lessons in elementary school",
  "Speaking Task 8": "Unusual Situation — A cactus-shaped coffee mug",
};

export type ModelAnswer = { level: Level; label: string; tier: Tier; text: string; paragraphs: string[]; wordCount: number; notes: { criterion: string; text: string }[]; aside: string | null; withMistakes: boolean };
export type ModelItem = {
  id: string;
  packItem: string;
  status: "ready" | "image-pending";
  subTest: "WRITING" | "SPEAKING";
  taskType: CelpipTaskType;
  title: string;
  heading: string;
  /** what the learner reads, in the payload shape the composer already understands */
  prompt: string;
  payload: Record<string, unknown>;
  scene: string | null;
  modelContext: string | null;
  answers: ModelAnswer[];
};
export type ModelData = { schema: 1; pack: string; levelLabel: string; trademark: string; items: ModelItem[] };
export type Blocked = { where: string; reason: string; findings?: GateFinding[] };
export type ImportResult = { data: ModelData; blocked: Blocked[]; hints: number; checkedTexts: number; skippedDuplicates: string[] };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** the learner-facing prompt line, matching the existing seed's wording for each task kind */
function promptAndPayload(it: PackItem, surveyInstruction: string | null): { prompt: string; payload: Record<string, unknown>; checkText: string } {
  if (it.kind === "email") {
    return {
      prompt: "Write an email responding to the situation below. Write 150–200 words.",
      payload: { situation: it.situation, instruction: it.instruction, wordMin: WORD_MIN, wordMax: WORD_MAX },
      checkText: `${it.situation}\n${it.instruction}`,
    };
  }
  if (it.kind === "survey") {
    return {
      prompt: "Read the survey question, choose ONE option, and explain your choice. Write 150–200 words.",
      payload: { topic: it.topic, optionA: it.optionA, optionB: it.optionB, instruction: surveyInstruction ?? "", wordMin: WORD_MIN, wordMax: WORD_MAX },
      checkText: `${it.topic}\nOption A: ${it.optionA}\nOption B: ${it.optionB}\n${surveyInstruction ?? ""}`,
    };
  }
  return {
    prompt: `Speaking Task ${it.number}: ${it.heading}.`,
    payload: { taskPrompt: it.taskPrompt, prepSeconds: it.prepSeconds, speakSeconds: it.speakSeconds, ...(it.scene ? { imageUrl: "", imageAlt: it.scene } : {}) },
    checkText: it.taskPrompt!,
  };
}

export function importPack(pack: Pack, lt: Lt, existing: { taskType: string; title: string; text: string }[] = []): ImportResult {
  const blocked: Blocked[] = [];
  const skippedDuplicates: string[] = [];
  const items: ModelItem[] = [];
  const existingTitles = new Set(existing.map((e) => `${e.taskType}::${e.title}`));
  const existingTexts = new Set(existing.map((e) => norm(e.text)));
  let hints = 0, checkedTexts = 0;
  const gate = (text: string, quotesExempt = false) => {
    checkedTexts++;
    const m = lt(text, LANGUAGE);
    hints += hintCount(m);
    return blockingFindings(text, m, { quotesExempt });
  };

  for (const it of pack.items) {
    const where = `${pack.file} · ${it.tableName} (${it.heading})`;
    const taskType = taskTypeOf(it.kind, it.number);
    const title = TITLES[it.tableName];
    if (!title) { blocked.push({ where, reason: "no product title for this pack item" }); continue; }
    if (existingTitles.has(`${taskType}::${title}`)) throw new Error(`${where}: title "${title}" is already used by the seed`);
    const { prompt, payload, checkText } = promptAndPayload(it, pack.surveyInstruction);
    if (existingTexts.has(norm(checkText))) { skippedDuplicates.push(`${where}: the same prompt is already in AlmiCELPIP`); continue; }
    const pf = gate(checkText);
    if (pf.length) { blocked.push({ where: `${where} · prompt`, reason: "grammar or spelling (en-CA)", findings: pf }); continue; }

    const answers: ModelAnswer[] = [];
    for (const a of it.answers) {
      const w = `${where} · ${a.label}`;
      const tier = tierOf(a.level);
      const words = countWords(a.text);
      const row = pack.wordTable.find((r) => r.item === it.tableName && r.level === a.level);
      if (!row) { blocked.push({ where: w, reason: "no row in the pack's word-count table" }); continue; }
      if (row.words !== words) { blocked.push({ where: w, reason: `word count differs from the pack's table: counted ${words}, table ${row.words}` }); continue; }
      if (it.kind === "speaking") {
        if (!a.notes.some((n) => n.text.trim().length > 10)) { blocked.push({ where: w, reason: "no notes: a model is shown only with its notes" }); continue; }
      } else {
        const missing = WRITING_CRITERIA.filter((c) => !a.notes.some((n) => n.criterion === c && n.text.trim().length > 5));
        if (missing.length) { blocked.push({ where: w, reason: `missing notes: ${missing.join(", ")}` }); continue; }
      }
      if (tier === "low") {
        const read = a.notes.find((n) => n.criterion === "Readability");
        if (it.kind !== "speaking" && !(read && /\*[^*]+\*/.test(read.text))) { blocked.push({ where: w, reason: "the Readability note names no error (no quoted mistake)" }); continue; }
      } else {
        if (it.kind !== "speaking" && (words < WORD_MIN || words > WORD_MAX)) { blocked.push({ where: w, reason: `${words} words: a ${a.label} written model must be ${WORD_MIN}–${WORD_MAX}` }); continue; }
        const af = gate(a.text);
        if (af.length) { blocked.push({ where: `${w} · answer`, reason: "grammar or spelling (en-CA)", findings: af }); continue; }
      }
      const nf = gate(a.notes.map((n) => `${n.criterion}: ${plainNote(n.text)}`).join("\n"), true);
      if (nf.length) { blocked.push({ where: `${w} · notes`, reason: "grammar or spelling (en-CA)", findings: nf }); continue; }
      if (a.aside) {
        const sf = gate(a.aside);
        if (sf.length) { blocked.push({ where: `${w} · aside`, reason: "grammar or spelling (en-CA)", findings: sf }); continue; }
      }
      answers.push({ level: a.level, label: a.label, tier, text: a.text, paragraphs: a.paragraphs, wordCount: words, notes: a.notes.map(({ criterion, text }) => ({ criterion, text })), aside: a.aside, withMistakes: tier === "low" });
    }
    if (it.modelContext) {
      const cf = gate(it.modelContext);
      if (cf.length) { blocked.push({ where: `${where} · model note`, reason: "grammar or spelling (en-CA)", findings: cf }); continue; }
    }
    if (!answers.length) { blocked.push({ where, reason: "no answer passed the gates, so the item is not imported" }); continue; }
    const order: Level[] = ["10+", "8", "7", "5"];
    answers.sort((x, y) => order.indexOf(x.level) - order.indexOf(y.level));
    items.push({
      id: `celpip-p1-${it.kind}-${it.number}`,
      packItem: it.tableName,
      status: it.scene ? "image-pending" : "ready",
      subTest: it.kind === "speaking" ? "SPEAKING" : "WRITING",
      taskType, title, heading: it.heading, prompt, payload,
      scene: it.scene ?? null,
      modelContext: it.modelContext ?? null,
      answers,
    });
  }
  items.sort((a, b) => a.id.localeCompare(b.id));
  return { data: { schema: 1, pack: pack.file, levelLabel: LEVEL_LABEL, trademark: TRADEMARK_LINE, items }, blocked, hints, checkedTexts, skippedDuplicates };
}
