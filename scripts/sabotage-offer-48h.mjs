// RR-397 · every free-48-hours proof must turn RED when broken, and GREEN when restored (each file restored byte-for-byte).
// Run: node scripts/sabotage-offer-48h.mjs   (needs the repo's deps for the tsx test)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const DIR = existsSync("src/lib/billing/stripe.ts") ? "src/lib/billing" : "src/lib";
const pick = (c) => c.find((p) => existsSync(p));
const PAGE = pick(["src/app/pricing/page.tsx", "src/app/(marketing)/pricing/page.tsx", "src/app/page.tsx"]);
const gate = () => spawnSync(process.execPath, ["scripts/gates/offer-48h.mjs"], { encoding: "utf8" });
const test = () => spawnSync(process.platform === "win32" ? "npx.cmd tsx scripts/verify-offer-48h.ts" : "npx tsx scripts/verify-offer-48h.ts", { encoding: "utf8", shell: true });
/* an AI route that uses aiGate (found at run time) — the case removes the door from it */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const walk = (d) => readdirSync(d).flatMap((n) => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : /route\.ts$/.test(n) ? [f] : []; });
const AI_ROUTE = existsSync("src/app/api") ? walk("src/app/api").find((f) => /\baiGate\(/.test(readFileSync(f, "utf8"))) : null;
/* RR-399: the claim test (atomic "1 free") and, where the repo has it, the email-before-free-AI test */
const tsxRun = (f) => () => spawnSync(process.platform === "win32" ? `npx.cmd tsx ${f}` : `npx tsx ${f}`, { encoding: "utf8", shell: true });
const claim = tsxRun("scripts/verify-free-ai-claim.ts");
const EMAIL_TEST = existsSync("scripts/verify-free-ai-email.ts") ? tsxRun("scripts/verify-free-ai-email.ts") : null;
const EXTRA_CASES = EMAIL_TEST && AI_ROUTE ? [
  { name: "the AI route stops asking for a verified email", file: AI_ROUTE, from: "if (freeAiNeedsVerifiedEmail(user))", to: "if (false)", run: [EMAIL_TEST], fail: ["EMAIL TEST FAIL"] },
  { name: "an unverified free account is let through", file: `${DIR}/free-access.ts`, from: "return !hasPaidAccess(user) && !isEmailVerified(user);", to: "return false;", run: [EMAIL_TEST], fail: ["EMAIL TEST FAIL"] },
] : [];
const CASES = [
  ...(AI_ROUTE ? [{ name: "an AI route skips the free door", file: AI_ROUTE, from: "aiGate(", to: "aiGateSkipped(", prepend: "const aiGateSkipped = async (..._a: unknown[]) => ({ ok: true as const, free: true });\n", run: [gate], fail: ["[FAIL] every AI route goes through aiGate()"] }] : []),
  { name: "the free time becomes 72 hours", file: `${DIR}/offer.ts`, from: "export const TASTE_HOURS = 48;", to: "export const TASTE_HOURS = 72;", run: [gate, test], fail: ["[FAIL] the free time is 48 hours", "FAIL a new sign-up gets 48 hours"] },
  { name: "free AI is allowed twice", file: `${DIR}/taste.ts`, from: "TASTE_AI_LIMITS = { WRITING: 1, SPEAKING: 1 }", to: "TASTE_AI_LIMITS = { WRITING: 2, SPEAKING: 1 }", run: [gate, test], fail: ["[FAIL] free 48 hours start at sign-up", "FAIL AI is used once and then blocked"] },
  { name: "the daily cap is switched off", file: `${DIR}/free-ai-budget.ts`, from: "return spentUnitsToday < FREE_AI_DAILY_BUDGET_UNITS;", to: "return spentUnitsToday >= 0;", run: [test], fail: ["FAIL the daily free-AI cap stops free AI"] },
  { name: "the checkout gives a card trial again", file: `${DIR}/stripe.ts`, append: "\nexport const sabotageTrial = { trial_period_days: 2 };\n", run: [gate, test], fail: ["[FAIL] the checkout code names no trial", "FAIL checkout has no trial"] },
  { name: "the free time stops being free after 48 hours", file: `${DIR}/taste.ts`, from: "return end !== null && end.getTime() > now;", to: "return end !== null;", run: [test], fail: ["FAIL after 48 hours the unlock screen appears"] },
  { name: "a page sells a card trial again", file: PAGE, append: "\n// Card not charged during the 48-hour trial\n", run: [gate], fail: ["[FAIL] no customer-facing line"] },
  /* RR-399 A3: the atomic "1 free" */
  { name: "a second request at the same moment also gets the free use", file: `${DIR}/free-ai-claim.ts`, from: 'if (isUniqueViolation(e)) return "USED";', to: 'return "RESERVED";', run: [claim], fail: ["CLAIM TEST FAIL"] },
  { name: "the free door stops reserving the free use", file: `${DIR}/free-access.ts`, from: "await claimFreeAi(", to: "await claimSkipped(", prepend: 'const claimSkipped = async (..._a: unknown[]) => "UNAVAILABLE" as const;\n', run: [gate], fail: ["[FAIL] the free door reserves the free use atomically"] },
  ...EXTRA_CASES,
];
const out = [];
for (const c of CASES) {
  const raw = readFileSync(c.file, "utf8");
  if (c.from && !raw.includes(c.from)) throw new Error(`anchor missing: ${c.name}`);
  try {
    writeFileSync(c.file, c.append ? raw + c.append : (c.prepend ?? "") + raw.split(c.from).join(c.to));
    const res = c.run.map((r) => r());
    out.push({ name: c.name, red: res.every((r, i) => r.status !== 0 && (r.stdout + r.stderr).includes(c.fail[i])) });
  } finally { writeFileSync(c.file, raw); }
  if (readFileSync(c.file, "utf8") !== raw) throw new Error(`${c.file} NOT restored`);
}
const g = gate(), t = test(), c = claim(), e = EMAIL_TEST ? EMAIL_TEST() : { status: 0 };
for (const o of out) console.log(`  [${o.red ? "RED as required" : "STAYED GREEN — BLIND"}] ${o.name}`);
console.log(`  restored: gate ${g.status === 0 ? "GREEN" : "NOT GREEN"}, test ${t.status === 0 ? "GREEN" : "NOT GREEN"}, claim test ${c.status === 0 ? "GREEN" : "NOT GREEN"}${EMAIL_TEST ? `, email test ${e.status === 0 ? "GREEN" : "NOT GREEN"}` : ""}`);
const pass = out.every((o) => o.red) && g.status === 0 && t.status === 0 && c.status === 0 && e.status === 0;
console.log(pass ? `\nSABOTAGE PASS — ${out.length}/${out.length} RED` : "\nSABOTAGE FAIL");
process.exitCode = pass ? 0 : 1;
