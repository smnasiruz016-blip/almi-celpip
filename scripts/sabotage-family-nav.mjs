// RR-398 · the family-nav gate must turn RED when broken and GREEN when restored (each file restored byte-for-byte).
// Run: node scripts/sabotage-family-nav.mjs
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const gate = () => spawnSync(process.execPath, ["scripts/gates/family-nav.mjs"], { encoding: "utf8" });
const walk = (d) => readdirSync(d).flatMap((n) => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : /\.(tsx|jsx)$/.test(n) ? [f] : []; });
const BAR_USER = walk("src").find((f) => !/almiworld[\\/]/.test(f) && /<AlmiWorldBar\b/.test(readFileSync(f, "utf8")));
const FOOT_USER = walk("src").find((f) => !/almiworld[\\/]/.test(f) && /<AlmiWorldFooter\b/.test(readFileSync(f, "utf8")));
const CASES = [
  { name: "Home points somewhere else", file: "src/lib/almiworld-family.ts", from: '"home": "https://almiworld.com/"', to: '"home": "https://almiworld.com/ebooks-2/"', fail: "[FAIL] Home goes to https://almiworld.com/" },
  { name: "the bar is taken off the pages", file: BAR_USER, from: "<AlmiWorldBar />", to: "", fail: "[FAIL] every page renders the AlmiWorld bar" },
  { name: "the footer is taken off the pages", file: FOOT_USER, from: "<AlmiWorldFooter", to: "<div data-x", fail: "[FAIL] every page renders the AlmiWorld footer" },
  { name: "an eBooks link comes back", file: BAR_USER, append: '\nexport const sabotageLink = { label: "Ebooks", href: "https://almiworld.com/ebooks-2/" };\n', fail: "[FAIL] no eBooks link" },
];
const out = [];
for (const c of CASES) {
  if (!c.file || !existsSync(c.file)) { out.push({ name: c.name, red: false, why: "file not found" }); continue; }
  const raw = readFileSync(c.file, "utf8");
  if (c.from && !raw.includes(c.from)) { out.push({ name: c.name, red: false, why: "anchor missing" }); continue; }
  try { writeFileSync(c.file, c.append ? raw + c.append : raw.split(c.from).join(c.to)); const r = gate(); out.push({ name: c.name, red: r.status !== 0 && (r.stdout + r.stderr).includes(c.fail) }); }
  finally { writeFileSync(c.file, raw); }
  if (readFileSync(c.file, "utf8") !== raw) throw new Error(`${c.file} NOT restored`);
}
const g = gate();
for (const o of out) console.log(`  [${o.red ? "RED as required" : "STAYED GREEN — BLIND"}] ${o.name}${o.why ? ` (${o.why})` : ""}`);
console.log(`  restored: gate ${g.status === 0 ? "GREEN" : "NOT GREEN"}`);
const pass = out.every((o) => o.red) && g.status === 0;
console.log(pass ? `\nSABOTAGE PASS — ${out.length}/${out.length} RED` : "\nSABOTAGE FAIL");
process.exitCode = pass ? 0 : 1;
