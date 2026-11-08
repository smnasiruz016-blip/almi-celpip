// RR-401 · the AlmiCELPIP factory importer (pattern: AlmiPrep RR-393). Reads a factory pack (.md, written and checked by beta-g),
// gates every item, and writes:
//   - src/content/factory/celpip-model-answers.json  (the app reads it; written only when it changes, so re-importing changes nothing)
//   - the gate report for beta-g                     (--report=<path>, optional)
// It never touches a database. The JSON is NOT read by `seed:prod` (scripts/seed/append.ts): new rows reach the database only
// through the owner's own seed step, scripts/factory/seed-celpip-pack.ts.
// Grammar: LanguageTool's free public API (no key, no cost), en-CA, at most 1 request every 3.5 s, every answer cached on disk
// (--cache=<dir>, outside the repo) so a re-import makes no request at all.
// Run: npx tsx scripts/factory/import-pack.mts <pack.md> --cache=<dir> [--report=<path>] [--dry]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parsePack } from "../../src/lib/factory/celpip-pack";
import { importPack } from "../../src/lib/factory/import";
import type { LtMatch } from "../../src/lib/factory/grammar-gate";
import { renderReport } from "../../src/lib/factory/report";
import { existingSeedTexts } from "./existing-seed";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const reportPath = args.find((a) => a.startsWith("--report="))?.slice(9);
const cacheDir = args.find((a) => a.startsWith("--cache="))?.slice(8);
const dry = args.includes("--dry");
if (!file || !cacheDir) throw new Error("usage: import-pack.mts <pack.md> --cache=<dir> [--report=<path>] [--dry]");

const OUT = join(process.cwd(), "src", "content", "factory", "celpip-model-answers.json");
mkdirSync(cacheDir, { recursive: true });
const key = (text: string, lang: string) => createHash("sha256").update(`${lang}\n${text}`).digest("hex");
const cached = (text: string, lang: string): LtMatch[] | null => { const f = join(cacheDir, `${key(text, lang)}.json`); return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null; };

async function fetchLt(text: string, lang: string): Promise<LtMatch[]> {
  for (let tries = 0; tries < 5; tries++) {
    const r = await fetch("https://api.languagetool.org/v2/check", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "AlmiCELPIP-content-factory/1.0" }, body: new URLSearchParams({ text, language: lang }) });
    if (r.ok) { const j = (await r.json()) as { matches: LtMatch[] }; return j.matches; }
    console.error(`  LanguageTool ${r.status}, waiting`); await new Promise((z) => setTimeout(z, 20000));
  }
  throw new Error("LanguageTool did not answer");
}

const pack = parsePack(readFileSync(file, "utf8"), file.split(/[\\/]/).pop()!);
const existing = existingSeedTexts();

// pass 1: learn every text the gates will check; fetch what is not cached yet
const wanted: { text: string; lang: string }[] = [];
importPack(pack, (text, lang) => { wanted.push({ text, lang }); return []; }, existing);
let fetched = 0;
for (const { text, lang } of wanted) {
  if (cached(text, lang)) continue;
  const matches = await fetchLt(text, lang);
  writeFileSync(join(cacheDir, `${key(text, lang)}.json`), JSON.stringify(matches));
  fetched++;
  await new Promise((z) => setTimeout(z, 3500));
}
// pass 2: the real import, from the cache only
const res = importPack(pack, (text, lang) => cached(text, lang) ?? (() => { throw new Error("cache miss"); })(), existing);
const body = JSON.stringify(res.data, null, 1) + "\n";
const prev = existsSync(OUT) ? readFileSync(OUT, "utf8") : null;
const changed = prev !== body;
if (changed && !dry) { mkdirSync(join(process.cwd(), "src", "content", "factory"), { recursive: true }); writeFileSync(OUT, body); }
if (reportPath) writeFileSync(reportPath, renderReport(pack, res));
const ready = res.data.items.filter((i) => i.status === "ready");
const answers = res.data.items.reduce((n, p) => n + p.answers.length, 0);
console.log(`items found ${pack.items.length} · imported ${res.data.items.length} (ready ${ready.length}, image pending ${res.data.items.length - ready.length}) · answers ${answers} · blocked ${res.blocked.length} · duplicates skipped ${res.skippedDuplicates.length} · texts checked ${res.checkedTexts} · style hints (not blocking) ${res.hints} · LanguageTool requests ${fetched} · data ${dry ? "NOT written (--dry)" : changed ? "WRITTEN" : "unchanged"}`);
for (const b of res.blocked) console.log(`  BLOCKED ${b.where}: ${b.reason}${b.findings ? ` — ${b.findings.map((f) => `"${f.text}" (${f.rule}: ${f.message})`).join(", ")}` : ""}`);
for (const d of res.skippedDuplicates) console.log(`  DUPLICATE ${d}`);
