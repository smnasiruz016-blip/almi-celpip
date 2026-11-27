// RR-418 Parts A + B · writes src/content/factory/rr418/model-answers-ab.json from AB_model_answers.json (md5-checked), in Pack 1's
// shape, keyed by live item id and by the item's FINAL title (after Part B's renames). Read-only for the database: the app reads this file.
// The test scripts/factory/rr418/rr418.test.ts rebuilds it in memory and fails if the committed file differs (no drift).
//   npx tsx scripts/factory/rr418/build-model-answers.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkInputs } from "../../../src/lib/factory/rr418/inputs";
import { convertAb } from "../../../src/lib/factory/rr418/model-answers";
import { rr418Inputs } from "./seed-plan";

export const MODEL_FILE = join("src", "content", "factory", "rr418", "model-answers-ab.json");

export function buildModelFile(): string {
  const { inp } = rr418Inputs();
  return `${JSON.stringify({ schema: 1, note: "RR-418 Parts A + B, built from AB_model_answers.json by scripts/factory/rr418/build-model-answers.ts. Do not edit by hand.", items: convertAb(inp.ab, inp.promptNow) }, null, 1)}\n`;
}

if (process.argv[1] && /build-model-answers\.ts$/.test(process.argv[1])) {
  checkInputs();
  writeFileSync(MODEL_FILE, buildModelFile());
  console.log(`wrote ${MODEL_FILE}`);
}
