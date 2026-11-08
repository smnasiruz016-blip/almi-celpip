// RR-401 · puts the factory's READY Writing and Speaking items (src/content/factory/celpip-model-answers.json) into CelpipItem,
// keyed by taskType + title (the product seed's own key). Run by the OWNER only. It is NOT part of `seed:prod` and the build never
// runs it. Dry run by default; it writes only with BOTH --confirm AND FACTORY_WRITE=yes.
//   - an item already there and equal: left alone (re-running changes nothing)
//   - an item already there but different: listed, NOT changed (a corrected pack needs the owner's word)
//   - an "image-pending" item is never written (hidden until an image exists)
//   - nothing is ever deleted or deactivated
// Run (DATABASE_URL set in this PowerShell process by the owner):
//   npx tsx scripts/factory/seed-celpip-pack.ts                                      (dry run)
//   $env:FACTORY_WRITE="yes"; npx tsx scripts/factory/seed-celpip-pack.ts --confirm   (write)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { runSeed, type ItemStore } from "../../src/lib/factory/seed-plan";
import type { ModelData } from "../../src/lib/factory/import";

const write = process.argv.includes("--confirm") && process.env.FACTORY_WRITE === "yes";
const data: ModelData = JSON.parse(readFileSync(join(process.cwd(), "src", "content", "factory", "celpip-model-answers.json"), "utf8"));
const prisma = new PrismaClient();

async function main() {
  const { rows, plan, written, pending } = await runSeed(prisma.celpipItem as unknown as ItemStore, data, write);
  console.log(`factory items ${data.items.length} · ready ${rows.length} · image pending (never written) ${pending.length} · create ${plan.create.length} · already there and equal ${plan.same.length} · there but different (NOT changed) ${plan.differs.length}`);
  for (const r of plan.create) console.log(`  + ${r.taskType}: ${r.title}`);
  for (const d of plan.differs) console.log(`  DIFFERS ${d}`);
  if (!write) { console.log("DRY RUN: nothing written. To write: set FACTORY_WRITE=yes and add --confirm."); return; }
  const back = await prisma.celpipItem.findMany({ where: { OR: rows.map((r) => ({ taskType: r.taskType, title: r.title })) }, select: { title: true, active: true } });
  console.log(`WRITTEN ${written}. Read back: ${back.length} of ${rows.length} factory items present, ${back.filter((b) => b.active).length} active.`);
}
main().finally(() => prisma.$disconnect()).catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1); });
