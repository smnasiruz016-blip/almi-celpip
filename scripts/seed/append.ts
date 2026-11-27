// Append-safe seeder. Inserts ONLY items not already in the database, so it is
// safe to run against a populated production DB and is fully idempotent (it runs
// on every deploy via `npm run seed:prod`).
//
// CelpipItem has no natural unique key (id is a cuid), so we dedupe on
// (taskType + title) — each item's title is unique within its task type across all
// seed sets. CELPIP has no profession axis, so the key is simpler than OET's.
//
//   npm run seed:append          insert missing items
//   npm run seed:append -- --dry preview only, write nothing
//
// Source of truth is the four task seed files and Batch 1 — we import their ITEMS arrays so
// there is never a second copy of the content to drift out of sync.
//
// 🔴 RR-418 · three additions, because the build runs this script and Preview shares the production DATABASE_URL:
//   1. on a Vercel PREVIEW build it does nothing (VERCEL_ENV=preview): a pull request never writes to production;
//   2. rr418-overrides.ts (generated) gives each changed item its RR-418 content, so a re-seed gives the same bank as production after
//      the owner's write. It only changes items already in the five files; it never adds one;
//   3. an item that RR-418 renames counts as present under its OLD title: a production deploy that lands before the owner's write never
//      inserts the renamed item a second time under its new title (after the write it is present under the new one).
// The 10 full Listening/Reading tests are never inserted here: only the owner's write creates them.

import { PrismaClient, type Prisma } from "@prisma/client";
import { ITEMS as LISTENING } from "./listening";
import { ITEMS as READING } from "./reading";
import { ITEMS as WRITING } from "./writing";
import { ITEMS as SPEAKING } from "./speaking";
import { ITEMS as BATCH1 } from "./batch1";
import { RR418_OVERRIDES, RR418_RENAMES } from "./rr418-overrides";

const DRY = process.argv.includes("--dry");

const key = (taskType: string, title: string) => `${taskType}::${title}`;

/** the five seed files, with each RR-418 override applied to the item it names */
export function seedItems(): Prisma.CelpipItemCreateManyInput[] {
  return [...LISTENING, ...READING, ...WRITING, ...SPEAKING, ...BATCH1].map((it) => {
    const o = RR418_OVERRIDES[key(it.taskType as string, it.title)];
    return o ? { ...it, title: o.title, prompt: o.prompt, guidanceNote: o.guidanceNote ?? it.guidanceNote, payload: o.payload as Prisma.InputJsonValue } : it;
  });
}

export function seedSkipReason(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "production") return `seed skipped: a Vercel ${env.VERCEL_ENV} build never writes (Preview shares the production database)`;
  return null;
}

/** existing (taskType,title) keys, plus the NEW title of every renamed item whose OLD title exists */
export function presentKeys(existing: { taskType: string; title: string }[], renames: { taskType: string; from: string; to: string }[] = RR418_RENAMES): Set<string> {
  const seen = new Set(existing.map((e) => key(e.taskType, e.title)));
  for (const r of renames) if (seen.has(key(r.taskType, r.from))) seen.add(key(r.taskType, r.to));
  return seen;
}

async function main() {
  const skip = seedSkipReason();
  if (skip) { console.log(skip); return; }
  const prisma = new PrismaClient();
  try {
    const ALL = seedItems();
    // Guard against an accidental duplicate (taskType,title) in source.
    const sourceKeys = ALL.map((it) => key(it.taskType as string, it.title));
    const dupes = sourceKeys.filter((k, i) => sourceKeys.indexOf(k) !== i);
    if (dupes.length > 0) {
      throw new Error(`Duplicate (taskType,title) in seed source: ${[...new Set(dupes)].join(", ")}`);
    }

    const existing = await prisma.celpipItem.findMany({ select: { taskType: true, title: true } });
    const seen = presentKeys(existing);
    const toInsert = ALL.filter((it) => !seen.has(key(it.taskType as string, it.title)));

    const bySubTest = (rows: { subTest: string }[]) =>
      rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.subTest] = (acc[r.subTest] ?? 0) + 1;
        return acc;
      }, {});

    console.log(`Source items: ${ALL.length} | already in DB: ${existing.length} | to insert: ${toInsert.length}`);
    const summary = bySubTest(toInsert as { subTest: string }[]);
    for (const t of Object.keys(summary).sort()) {
      console.log(`  + ${t}: ${summary[t]}`);
    }

    if (toInsert.length === 0) {
      console.log("Nothing to insert — database already has every source item.");
      return;
    }
    if (DRY) {
      console.log("\n--dry: no rows written. Re-run without --dry to insert.");
      return;
    }

    const res = await prisma.celpipItem.createMany({ data: toInsert });
    console.log(`\nInserted ${res.count} new item(s). Skipped ${ALL.length - toInsert.length} already present.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && /append\.ts$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
