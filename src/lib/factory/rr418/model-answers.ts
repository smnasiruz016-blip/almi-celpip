// RR-418 Parts A + B · the factory's model answers (AB_model_answers.json: 96 live Writing/Speaking items, keyed by live item id) in the
// SAME shape as Pack 1's (src/content/factory/celpip-model-answers.json), so the one <ModelAnswers> component shows both.
// Writing: CELPIP 10+, 8 and 5. Speaking: CELPIP 10+ and 7. Each with its notes. Pure.
import type { ModelAnswer, ModelItem } from "../import";
import type { Level, Tier } from "../celpip-pack";
import { parsePromptFix, type AbData, type PromptNow } from "./plan";

export type AbModelItem = Omit<ModelItem, "id" | "packItem" | "prompt" | "payload" | "scene" | "heading"> & { id: string; itemId: string; source: string };

const LEVEL: Record<string, { level: Level; tier: (n: number) => Tier }> = {
  "CELPIP 10+": { level: "10+", tier: () => "top" },
  "CELPIP 8": { level: "8", tier: () => "middle" },
  "CELPIP 7": { level: "7", tier: () => "middle" },
  "CELPIP 5": { level: "5", tier: () => "low" },
};

/** "**Content/Coherence:** text" → { criterion: "Content/Coherence", text } */
export function noteOf(n: string): { criterion: string; text: string } {
  const m = /^\*\*([^*:]+):\*\*\s*([\s\S]*)$/.exec(n.trim());
  return m ? { criterion: m[1].trim(), text: m[2].trim() } : { criterion: "Notes", text: n.trim() };
}

export function convertAb(ab: AbData, promptNow: PromptNow): AbModelItem[] {
  const out: AbModelItem[] = [];
  for (const [itemId, v] of Object.entries(ab.items)) {
    const now = promptNow[itemId];
    if (!now) throw new Error(`model answers for ${itemId}: the item is not in the export`);
    const renamed = v.promptFix ? parsePromptFix(now.taskType, v.promptFix).title : null;
    const answers: ModelAnswer[] = v.levels.map((l, i) => {
      const L = LEVEL[l.level];
      if (!L) throw new Error(`model answers for ${itemId}: unknown level "${l.level}"`);
      const paragraphs = l.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      return { level: L.level, label: l.level, tier: L.tier(i), text: l.text, paragraphs, wordCount: l.words, notes: l.notes.map(noteOf), aside: l.heading?.trim() ? l.heading.trim() : null, withMistakes: false };
    });
    out.push({ id: `rr418-${itemId}`, itemId, source: v.source, status: "ready", subTest: now.taskType.startsWith("WRITING") ? "WRITING" : "SPEAKING", taskType: now.taskType as ModelItem["taskType"], title: renamed ?? now.title, modelContext: null, answers });
  }
  return out;
}
