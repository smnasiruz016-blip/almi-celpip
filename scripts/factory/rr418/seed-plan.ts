// RR-418 · the seed bank with RR-418's changes to existing items (Parts B, C and F) applied by the SAME function the owner's write
// applies to the live rows (src/lib/factory/rr418/plan.ts). The owner's export of 27 Nov 2026 tells which seed item is which live item
// (same taskType + title). This file is used by the generator of scripts/seed/rr418-overrides.ts and by the tests — never by the build:
// seed:prod (scripts/seed/append.ts) reads only the five seed files and the generated overrides, never this factory data.
// The 10 full tests are NOT in the seed: only the owner's write creates them, so a deploy can never create them (twice).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma } from "@prisma/client";
import { ITEMS as LISTENING } from "../../seed/listening";
import { ITEMS as READING } from "../../seed/reading";
import { ITEMS as WRITING } from "../../seed/writing";
import { ITEMS as SPEAKING } from "../../seed/speaking";
import { ITEMS as BATCH1 } from "../../seed/batch1";
import { planRow, renames, type Change, type Inputs, type LiveRow, type PromptNow } from "../../../src/lib/factory/rr418/plan";

export type SeedItem = Prisma.CelpipItemCreateManyInput;
export const SOURCE: SeedItem[] = [...LISTENING, ...READING, ...WRITING, ...SPEAKING, ...BATCH1];

const ROOT = process.cwd();
const json = <T,>(p: string): T => JSON.parse(readFileSync(join(ROOT, p), "utf8")) as T;
export const keyOf = (taskType: string, title: string) => `${taskType}::${title}`;

export function rr418Inputs(): { inp: Inputs; exportRows: LiveRow[] } {
  const X = json<{ items: LiveRow[] }>("scripts/factory/fixtures/rr418/DB_CELPIP_EXPORT.json");
  const promptNow: PromptNow = Object.fromEntries(X.items.map((r) => [r.id, { taskType: r.taskType, title: r.title, taskPrompt: String((r.payload as { taskPrompt?: string } | null)?.taskPrompt ?? "") }]));
  const dir = "src/content/factory/rr418";
  return { inp: { ab: json(`${dir}/AB_model_answers.json`), c: json(`${dir}/C_live_LR_fixes.json`), f: json(`${dir}/F_live_fixes.json`), promptNow, add: json(`${dir}/addendum_v1.json`) }, exportRows: X.items };
}

/** the seed source with RR-418 applied, and what happened to each change */
export function seedWithRr418(source: SeedItem[] = SOURCE, data = rr418Inputs()): { items: SeedItem[]; changes: Change[]; unmatched: string[] } {
  const idByKey = new Map(data.exportRows.map((r) => [keyOf(r.taskType, r.title), r.id]));
  const changes: Change[] = [];
  const items = source.map((it) => {
    const id = idByKey.get(keyOf(String(it.taskType), it.title));
    if (!id) return it;
    const { next, changes: c } = planRow({ id, subTest: String(it.subTest), taskType: String(it.taskType), title: it.title, prompt: it.prompt, payload: it.payload, guidanceNote: it.guidanceNote ?? null }, data.inp);
    changes.push(...c);
    return { ...it, title: next.title, prompt: next.prompt, payload: next.payload as Prisma.InputJsonValue, guidanceNote: next.guidanceNote ?? it.guidanceNote };
  });
  const inSeed = new Set(changes.map((c) => c.id));
  const named = new Set([...Object.keys(data.inp.c.items), ...Object.entries(data.inp.ab.items).filter(([, v]) => v.promptFix).map(([id]) => id), ...data.inp.f.timing.map((t) => t.id), ...data.inp.f.spelling.map((t) => t.id), ...data.inp.f.reading_stem.map((t) => t.id)]);
  return { items, changes, unmatched: [...named].filter((id) => !inSeed.has(id)) };
}

/** old (taskType, title) → new title, for the items Part B renames */
export const RENAMES = () => renames(rr418Inputs().inp);
