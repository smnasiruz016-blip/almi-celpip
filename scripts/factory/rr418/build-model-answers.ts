// RR-418 Parts A + B · writes src/content/factory/rr418/model-answers-ab.json from AB_model_answers.json (md5-checked), in Pack 1's
// shape, keyed by live item id and by the item's FINAL title (after Part B's renames). Read-only for the database: the app reads this file.
// Addendum v1 (beta-g, 27 Nov 2026) · plus "overrides": the 5 live Pack 1 Speaking items whose answers the addendum changes (Task 5
// replaced: camping against the cottage, 10+ and 7; Tasks 2, 6, 7, 8 gain a CELPIP 7 answer next to their own 10+). The app looks these up
// FIRST (by item id, then taskType + title), so Pack 1's own file (celpip-model-answers.json, made by the gated import) stays untouched.
// The test scripts/factory/rr418/rr418.test.ts rebuilds it in memory and fails if the committed file differs (no drift).
//   npx tsx scripts/factory/rr418/build-model-answers.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkInputs } from "../../../src/lib/factory/rr418/inputs";
import { convertAb } from "../../../src/lib/factory/rr418/model-answers";
import { mergeAnswers } from "../../../src/lib/factory/rr418/addendum";
import type { ModelData } from "../../../src/lib/factory/import";
import { rr418Inputs, keyOf } from "./seed-plan";

export const MODEL_FILE = join("src", "content", "factory", "rr418", "model-answers-ab.json");
const PACK1_FILE = join("src", "content", "factory", "celpip-model-answers.json");

export function addendumOverrides() {
  const { inp, exportRows } = rr418Inputs();
  const pack = JSON.parse(readFileSync(PACK1_FILE, "utf8")) as ModelData;
  return (inp.add?.modelAnswers ?? []).map((m) => {
    const own = pack.items.find((i) => i.id === m.packItem);
    if (!own) throw new Error(`addendum: Pack 1 has no item ${m.packItem}`);
    const live = exportRows.find((r) => keyOf(r.taskType, r.title) === keyOf(own.taskType, own.title));
    if (!live) throw new Error(`addendum: ${m.packItem} ("${own.title}") is not a live item`);
    return { id: own.id, itemId: live.id, packItem: m.packItem, source: "RR-418_addendum_v1.md", status: own.status, subTest: own.subTest, taskType: own.taskType, title: own.title, modelContext: own.modelContext, answers: mergeAnswers(own.answers, m) };
  });
}

export function buildModelFile(): string {
  const { inp } = rr418Inputs();
  return `${JSON.stringify({ schema: 1, note: "RR-418 Parts A + B, built from AB_model_answers.json, plus the addendum v1 overrides of 5 Pack 1 Speaking items, by scripts/factory/rr418/build-model-answers.ts. Do not edit by hand.", items: convertAb(inp.ab, inp.promptNow), overrides: addendumOverrides() }, null, 1)}\n`;
}

if (process.argv[1] && /build-model-answers\.ts$/.test(process.argv[1])) {
  checkInputs();
  writeFileSync(MODEL_FILE, buildModelFile());
  console.log(`wrote ${MODEL_FILE}`);
}
