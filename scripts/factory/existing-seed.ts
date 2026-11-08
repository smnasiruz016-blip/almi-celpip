// RR-401 · every Writing and Speaking item already in the product's seed (the same five files `seed:prod` reads), as
// { taskType, title, text } so the importer can refuse a title clash and skip a prompt that is already there.
import { ITEMS as LISTENING } from "../seed/listening";
import { ITEMS as READING } from "../seed/reading";
import { ITEMS as WRITING } from "../seed/writing";
import { ITEMS as SPEAKING } from "../seed/speaking";
import { ITEMS as BATCH1 } from "../seed/batch1";

export const SEED_ITEMS = [...LISTENING, ...READING, ...WRITING, ...SPEAKING, ...BATCH1];

export function existingSeedTexts(): { taskType: string; title: string; text: string }[] {
  return SEED_ITEMS.map((it) => {
    const p = (it.payload ?? {}) as Record<string, string>;
    const t = String(it.taskType);
    const text = t === "WRITING_EMAIL" ? `${p.situation}\n${p.instruction}`
      : t === "WRITING_SURVEY" ? `${p.topic}\nOption A: ${p.optionA}\nOption B: ${p.optionB}\n${p.instruction ?? ""}`
      : t.startsWith("SPEAKING") ? String(p.taskPrompt ?? "")
      : it.title;
    return { taskType: t, title: it.title, text };
  });
}
