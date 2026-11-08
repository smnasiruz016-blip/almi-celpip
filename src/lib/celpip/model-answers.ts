// RR-401 · model answers for Writing and Speaking items, from the content factory (src/content/factory/celpip-model-answers.json,
// written by scripts/factory/import-pack.mts after the gates). Read-only, in the repo, no database. An item matches by its
// taskType + title, the same key the seed uses. An "image-pending" item is never returned: it is hidden until an image exists.
import data from "@/content/factory/celpip-model-answers.json";
import type { ModelData, ModelItem } from "@/lib/factory/import";

const DATA = data as unknown as ModelData;
const BY_KEY = new Map(DATA.items.filter((i) => i.status === "ready").map((i) => [`${i.taskType}::${i.title}`, i]));

export const MODEL_LEVEL_LABEL = DATA.levelLabel;
export const MODEL_TRADEMARK = DATA.trademark;

export function modelAnswersFor(taskType: string, title: string): ModelItem | null {
  return BY_KEY.get(`${taskType}::${title}`) ?? null;
}
