// RR-401 · model answers for Writing and Speaking items, from the content factory (src/content/factory/celpip-model-answers.json,
// written by scripts/factory/import-pack.mts after the gates). Read-only, in the repo, no database. An item matches by its
// taskType + title, the same key the seed uses. An "image-pending" item is never returned: it is hidden until an image exists.
// RR-418 · plus every other live Writing and Speaking item (src/content/factory/rr418/model-answers-ab.json, Parts A + B): matched by the
// live item's id first, then by taskType + its final title (a local database seeded from the seed source has other ids).
import data from "@/content/factory/celpip-model-answers.json";
import ab from "@/content/factory/rr418/model-answers-ab.json";
import type { ModelData, ModelItem } from "@/lib/factory/import";

const DATA = data as unknown as ModelData;
type AbItem = Pick<ModelItem, "status" | "subTest" | "taskType" | "title" | "modelContext" | "answers"> & { id: string; itemId: string };
const AB = (ab as unknown as { items: AbItem[] }).items;
// RR-418 addendum v1 · 5 live Pack 1 Speaking items whose answers beta-g changed: looked up before anything else
const OVR = (ab as unknown as { overrides?: AbItem[] }).overrides ?? [];
const OVR_ID = new Map(OVR.map((i) => [i.itemId, i]));
const OVR_KEY = new Map(OVR.map((i) => [`${i.taskType}::${i.title}`, i]));

const BY_KEY = new Map<string, Pick<ModelItem, "id" | "title" | "taskType" | "modelContext" | "answers">>(DATA.items.filter((i) => i.status === "ready").map((i) => [`${i.taskType}::${i.title}`, i]));
const BY_ID = new Map(AB.map((i) => [i.itemId, i]));
for (const i of AB) if (!BY_KEY.has(`${i.taskType}::${i.title}`)) BY_KEY.set(`${i.taskType}::${i.title}`, i);

export const MODEL_LEVEL_LABEL = DATA.levelLabel;
export const MODEL_TRADEMARK = DATA.trademark;

export function modelAnswersFor(taskType: string, title: string, itemId?: string): Pick<ModelItem, "id" | "title" | "taskType" | "modelContext" | "answers"> | null {
  return (itemId ? OVR_ID.get(itemId) ?? BY_ID.get(itemId) : undefined) ?? OVR_KEY.get(`${taskType}::${title}`) ?? BY_KEY.get(`${taskType}::${title}`) ?? null;
}
