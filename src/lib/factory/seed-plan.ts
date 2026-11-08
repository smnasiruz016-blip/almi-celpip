/**
 * RR-401 · what the owner's seed would do, decided by a pure function (tested without a database).
 * Only "ready" items become CelpipItem rows. An "image-pending" item is never written: it stays hidden until an image exists.
 * The key is the one the product's own seed uses: taskType + title.
 */
import type { CelpipTaskType } from "@prisma/client";
import type { ModelData, ModelItem } from "./import";

export type SeedRow = {
  subTest: "WRITING" | "SPEAKING";
  taskType: CelpipTaskType;
  title: string;
  prompt: string;
  difficulty: "CORE";
  topicTag: "everyday";
  payload: Record<string, unknown>;
  active: true;
};
export type LiveRow = { taskType: string; title: string; prompt: string; payload: unknown };

export const seedRowFor = (it: ModelItem): SeedRow => ({
  subTest: it.subTest, taskType: it.taskType, title: it.title, prompt: it.prompt, difficulty: "CORE", topicTag: "everyday", payload: it.payload, active: true,
});

export const seedRows = (data: ModelData): SeedRow[] => data.items.filter((i) => i.status === "ready").map(seedRowFor);
export const imagePending = (data: ModelData): ModelItem[] => data.items.filter((i) => i.status === "image-pending");

const k = (taskType: string, title: string) => `${taskType}::${title}`;
const stable = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

/** the database calls the seed needs: the real script passes Prisma's celpipItem, the test passes a fake */
export type ItemStore = {
  findMany(args: { where: { taskType: { in: string[] } }; select: Record<string, true> }): Promise<LiveRow[]>;
  create(args: { data: SeedRow }): Promise<unknown>;
};

/** dry run unless write is true; returns what it did. Never deletes, never changes a row that is already there. */
export async function runSeed(store: ItemStore, data: ModelData, write: boolean) {
  const rows = seedRows(data);
  const live = await store.findMany({ where: { taskType: { in: [...new Set(rows.map((r) => r.taskType as string))] } }, select: { taskType: true, title: true, prompt: true, payload: true } });
  const plan = planSeed(rows, live);
  let written = 0;
  if (write) for (const r of plan.create) { await store.create({ data: r }); written++; }
  return { rows, plan, written, pending: imagePending(data) };
}

export function planSeed(rows: SeedRow[], live: LiveRow[]) {
  const byKey = new Map(live.map((l) => [k(l.taskType, l.title), l]));
  const create: SeedRow[] = [], same: string[] = [], differs: string[] = [];
  for (const r of rows) {
    const l = byKey.get(k(r.taskType, r.title));
    if (!l) { create.push(r); continue; }
    const eq = l.prompt === r.prompt && stable(l.payload) === stable(r.payload);
    (eq ? same : differs).push(eq ? r.title : `${r.title}: the live row is not the same as the pack (NOT changed)`);
  }
  return { create, same, differs };
}
