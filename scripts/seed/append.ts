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
// Source of truth is the four task seed files — we import their ITEMS arrays so
// there is never a second copy of the content to drift out of sync.

import { PrismaClient } from "@prisma/client";
import { ITEMS as LISTENING } from "./listening";
import { ITEMS as READING } from "./reading";
import { ITEMS as WRITING } from "./writing";
import { ITEMS as SPEAKING } from "./speaking";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

const ALL = [...LISTENING, ...READING, ...WRITING, ...SPEAKING];

const key = (taskType: string, title: string) => `${taskType}::${title}`;

async function main() {
  // Guard against an accidental duplicate (taskType,title) in source.
  const sourceKeys = ALL.map((it) => key(it.taskType as string, it.title));
  const dupes = sourceKeys.filter((k, i) => sourceKeys.indexOf(k) !== i);
  if (dupes.length > 0) {
    throw new Error(`Duplicate (taskType,title) in seed source: ${[...new Set(dupes)].join(", ")}`);
  }

  const existing = await prisma.celpipItem.findMany({
    select: { taskType: true, title: true },
  });
  const seen = new Set(existing.map((e) => key(e.taskType, e.title)));

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
