// RR-394 · every offer proof must turn RED when broken, and GREEN when restored (each file restored byte-for-byte).
// Run: node scripts/sabotage-offer-48h.mjs   (needs the repo's deps for the tsx test)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const pick = (c) => c.find((p) => existsSync(p));
const OFFER = pick(["src/lib/billing/offer.ts", "src/lib/offer.ts"]);
const STRIPE = pick(["src/lib/billing/stripe.ts", "src/lib/stripe.ts"]);
const PAGE = pick(["src/app/pricing/page.tsx", "src/app/(marketing)/pricing/page.tsx", "src/app/page.tsx"]);
const gate = () => spawnSync(process.execPath, ["scripts/gates/offer-48h.mjs"], { encoding: "utf8" });
const test = () => spawnSync(process.platform === "win32" ? "npx.cmd tsx scripts/verify-offer-48h.ts" : "npx tsx scripts/verify-offer-48h.ts", { encoding: "utf8", shell: true });
const CASES = [
  { name: "the trial goes back to 7 days", file: OFFER, from: "export const TRIAL_PERIOD_DAYS = 2;", to: "export const TRIAL_PERIOD_DAYS = 7;", run: [gate, test], fail: ["[FAIL] the offer is 2 days", "FAIL a new checkout has a 48-hour trial"] },
  { name: "code cuts a running trial (sets trial_end)", file: STRIPE, append: "\n// sabotage\nexport const cut = (s: any) => s.subscriptions.update(\"sub\", { trial_end: Math.floor(Date.now() / 1000) + 172800 });\n", run: [gate], fail: ["[FAIL] no code sets trial_end"] },
  { name: "a page sells the 7-day trial again", file: PAGE, append: "\n// Start your 7-day free trial\n", run: [gate], fail: ["[FAIL] no customer-facing line"] },
];
const out = [];
for (const c of CASES) {
  const raw = readFileSync(c.file, "utf8");
  if (c.from && !raw.includes(c.from)) throw new Error(`anchor missing: ${c.name}`);
  try {
    writeFileSync(c.file, c.append ? raw + c.append : raw.replace(c.from, c.to));
    const res = c.run.map((r) => r());
    out.push({ name: c.name, red: res.every((r, i) => r.status !== 0 && (r.stdout + r.stderr).includes(c.fail[i])) });
  } finally { writeFileSync(c.file, raw); }
  if (readFileSync(c.file, "utf8") !== raw) throw new Error(`${c.file} NOT restored`);
}
const g = gate(), t = test();
for (const o of out) console.log(`  [${o.red ? "RED as required" : "STAYED GREEN — BLIND"}] ${o.name}`);
console.log(`  restored: gate ${g.status === 0 ? "GREEN" : "NOT GREEN"}, test ${t.status === 0 ? "GREEN" : "NOT GREEN"}`);
const pass = out.every((o) => o.red) && g.status === 0 && t.status === 0;
console.log(pass ? `\nSABOTAGE PASS — ${out.length}/${out.length} RED` : "\nSABOTAGE FAIL");
process.exitCode = pass ? 0 : 1;
