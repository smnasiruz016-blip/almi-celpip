// Dev-only: validate every seed item's payload against its runtime Zod schema,
// so a malformed payload is caught here, not at scoring time. Run: tsx scripts/validate-seed.ts
import { ITEMS as L } from "./seed/listening";
import { ITEMS as R } from "./seed/reading";
import { ITEMS as W } from "./seed/writing";
import { ITEMS as S } from "./seed/speaking";
import { ITEMS as BATCH1 } from "./seed/batch1";
import { listeningPayloadSchema } from "../src/lib/celpip/tasks/listening";
import { readingPayloadSchema } from "../src/lib/celpip/tasks/reading";
import { writingEmailPayloadSchema, writingSurveyPayloadSchema } from "../src/lib/celpip/tasks/writing";
import { speakingPayloadSchema } from "../src/lib/celpip/tasks/speaking";

type Schema = { safeParse: (v: unknown) => { success: boolean; error?: unknown } };

// Per-task-type schema. Listening + Reading share one schema per sub-test;
// Writing splits Email vs Survey; Speaking shares one schema across all 8 tasks.
function schemaFor(taskType: string): Schema | null {
  if (taskType === "WRITING_EMAIL") return writingEmailPayloadSchema;
  if (taskType === "WRITING_SURVEY") return writingSurveyPayloadSchema;
  if (taskType.startsWith("LISTENING")) return listeningPayloadSchema;
  if (taskType.startsWith("READING")) return readingPayloadSchema;
  if (taskType.startsWith("SPEAKING")) return speakingPayloadSchema;
  return null;
}

const all = [...L, ...R, ...W, ...S, ...BATCH1];
let bad = 0;
for (const it of all) {
  const sc = schemaFor(it.taskType as string);
  if (!sc) {
    bad++;
    console.error(`FAIL [${it.taskType}] ${it.title}: no schema for task type`);
    continue;
  }
  const res = sc.safeParse(it.payload);
  if (!res.success) {
    bad++;
    console.error(`FAIL [${it.taskType}] ${it.title}:`, JSON.stringify(res.error).slice(0, 300));
  }
}
console.log(bad ? `\n${bad} invalid payload(s)` : `All ${all.length} payloads valid ✓`);
process.exit(bad ? 1 : 0);
