// RR-397 · the "free 48 hours, no card" gate. Pure node (no install, no database, no secrets), so CI can run it as it is.
// RED when: the offer is not 48 hours / not the owner's words; the checkout gives Stripe ANY trial (new people get no card trial);
// any code sets trial_end (would cut a running card trial); the free-48-hours file or the free-AI budget is missing or not used by
// any AI route; the budget is over $0.035/day; or any customer-facing line still sells a card trial or "monthly only".
// Run: node scripts/gates/offer-48h.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const fails = [];
const ok = (cond, name) => { if (!cond) fails.push(name); console.log(`  [${cond ? "PASS" : "FAIL"}] ${name}`); };
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const find = (c) => c.find((p) => existsSync(join(ROOT, p)));
const DIR = existsSync(join(ROOT, "src/lib/billing/stripe.ts")) ? "src/lib/billing" : "src/lib";
const OFFER = find([`${DIR}/offer.ts`]), STRIPE = find([`${DIR}/stripe.ts`]), TASTE = find([`${DIR}/taste.ts`]), BUDGET = find([`${DIR}/free-ai-budget.ts`]);
ok(Boolean(OFFER && STRIPE && TASTE && BUDGET), `offer.ts, stripe.ts, taste.ts and free-ai-budget.ts exist in ${DIR}`);
if (!(OFFER && STRIPE && TASTE && BUDGET)) { console.log("\nOFFER GATE FAIL"); process.exit(1); }

const offer = read(OFFER), stripe = read(STRIPE), taste = read(TASTE), budget = read(BUDGET);
ok(/export const TASTE_HOURS = 48;/.test(offer), "the free time is 48 hours");
ok(/OFFER_LINE = "Try free for 48 hours, no card\. Then \$12\/month\. Cancel anytime\.";/.test(offer), "the offer line is the owner's own words");
ok(/trialForNewCheckout\(\): Record<string, never> \{\s*return \{\};/.test(offer), "a new checkout hands Stripe no trial");
ok(!/trial_period_days|trialPeriodDays|trial_end|trial_from_plan/.test(stripe.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "")), "the checkout code names no trial (no trial_period_days, trial_end or trial_from_plan)");
ok(/createdAt/.test(taste) && /subscriptionStatus != null/.test(taste) && /TASTE_AI_LIMITS = \{ WRITING: 1, SPEAKING: 1 \}/.test(taste), "free 48 hours start at sign-up, once per never-subscribed account, AI 1 Writing + 1 Speaking");
const units = Number((/FREE_AI_DAILY_BUDGET_UNITS = (\d+);/.exec(budget) ?? [])[1]);
ok(units > 0 && units <= 350, `the free-AI budget is at most $0.035 a day for this product (${units} units)`);

const SKIP = /node_modules|\.next|[\\/](seed|seeds|fixtures|generated|__tests__)[\\/]|\.test\./i;
const walk = (d) => !existsSync(d) ? [] : readdirSync(d).flatMap((n) => { const f = join(d, n); if (SKIP.test(f)) return []; const s = statSync(f); return s.isDirectory() ? walk(f) : /\.(tsx?|jsx?|mjs)$/.test(n) ? [f] : []; });
const code = walk(join(ROOT, "src")).map((f) => [relative(ROOT, f).split(sep).join("/"), readFileSync(f, "utf8")]);
const strip = (t) => t.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");
ok(!code.some(([, t]) => /trial_period_days|trialPeriodDays/.test(strip(t))), "no code anywhere gives Stripe a trial length");
ok(!code.some(([, t]) => /subscriptions\.update\([\s\S]{0,400}trial_end|trial_end\s*:\s*(?!null)/.test(strip(t))), "no code sets trial_end (a running card trial is never cut)");
ok(code.some(([, t]) => /\.trial_end\b|current_period_end/.test(t)), "card trials and paid access still come from Stripe's own dates");
/* every API route that calls AI (an import from lib/ai, a transcription or an Anthropic/OpenAI client) must either pass through
   aiGate() (the free-48-hours door with the 1-per-kind rule and the daily budget) or say "RR-397: paid only" (e.g. the full mock) */
const aiRoutes = code.filter(([p, t]) => /^src\/app\/api\//.test(p) && /from "@\/lib\/ai\/|transcribe|anthropic|openai/i.test(strip(t)));
const unguarded = aiRoutes.filter(([, t]) => !/\baiGate\(/.test(t) && !/RR-397: paid only/.test(t));
const freeAccess = code.find(([p]) => /free-access\.ts$/.test(p));
ok(Boolean(freeAccess) && /tasteMayUseAi/.test(freeAccess[1]) && /freeAiAllowedToday/.test(freeAccess[1]), "the free door (free-access.ts) applies the 1-per-kind rule and today's free-AI budget");
ok(unguarded.length === 0, `every AI route goes through aiGate() or is marked paid only (${aiRoutes.length} AI routes, ${unguarded.length} unguarded)`);
for (const [p] of unguarded) console.log(`      unguarded: ${p}`);

/* the customer-facing lines: app code and copy under src/ and public/, exam material excluded */
const COPY_SKIP = /node_modules|\.next|[\\/](seed|seeds|fixtures|generated|__tests__|universities)[\\/]|[\\/]content[\\/](reading|listening|writing|speaking|exam|bank|items|questions|passages|scripts)[\\/]|\.test\./i;
const BANNED = /\b7[- ]day\b|\bseven[- ]day\b|7 days? free|monthly only|monthly-only|\bno (free )?trial\b|7 day free trial|48[- ]hour (free )?trial|card (is )?not charged during|Try free for 48 hours, then|start your (free )?trial/i;
const copyWalk = (d) => !existsSync(d) ? [] : readdirSync(d).flatMap((n) => { const f = join(d, n); if (COPY_SKIP.test(f)) return []; const s = statSync(f); return s.isDirectory() ? copyWalk(f) : /\.(tsx?|jsx?|mjs|json|md|mdx|html|txt)$/.test(n) ? [f] : []; });
const ALLOW = existsSync(join(ROOT, "scripts/gates/offer-48h.allow.json")) ? JSON.parse(read("scripts/gates/offer-48h.allow.json")) : [];
const left = [];
for (const f of ["src", "public"].flatMap((d) => copyWalk(join(ROOT, d)))) {
  const p = relative(ROOT, f).split(sep).join("/");
  readFileSync(f, "utf8").split(/\r?\n/).forEach((l, i) => { if (BANNED.test(l) && !ALLOW.some((a) => a.file === p && l.includes(a.text))) left.push(`${p}:${i + 1}: ${l.trim().slice(0, 140)}`); });
}
ok(left.length === 0, `no customer-facing line sells a card trial or "monthly only" (${left.length} left)`);
for (const l of left.slice(0, 30)) console.log(`      ${l}`);
console.log(fails.length ? `\nOFFER GATE FAIL (${fails.length})` : "\nOFFER GATE PASS");
process.exitCode = fails.length ? 1 : 0;
