// RR-394 · the 48-hour offer gate. Pure node (no install, no database, no secrets), so CI runs it as it is.
// RED when: the offer file is not 2 days / 48 hours; the checkout does not take its trial from the offer file; any code sets a
// trial_end or a trial on an EXISTING subscription (that would cut a running 7-day trial); any code derives a trial end from the
// offer number instead of from Stripe; access is not read from Stripe's own dates; or any customer-facing line still sells a 7-day
// trial, "monthly only" or "no trial". Run: node scripts/gates/offer-48h.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const fails = [];
const ok = (cond, name) => { if (!cond) fails.push(name); console.log(`  [${cond ? "PASS" : "FAIL"}] ${name}`); };
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const find = (cands) => cands.find((p) => existsSync(join(ROOT, p)));

const OFFER = find(["src/lib/billing/offer.ts", "src/lib/offer.ts"]);
const STRIPE = find(["src/lib/billing/stripe.ts", "src/lib/stripe.ts"]);
ok(Boolean(OFFER), "the offer file exists (src/lib/billing/offer.ts or src/lib/offer.ts)");
ok(Boolean(STRIPE), "the Stripe checkout file exists");
if (!OFFER || !STRIPE) { console.log("\nOFFER GATE FAIL"); process.exit(1); }

const offer = read(OFFER), stripe = read(STRIPE);
ok(/export const TRIAL_PERIOD_DAYS = 2;/.test(offer), "the offer is 2 days (48 hours) for a new checkout");
ok(/OFFER_LINE = "Try free for 48 hours, then \$12\/month\. Cancel anytime\.";/.test(offer), "the offer line is the owner's own words");
ok(/from "\.\/offer"/.test(stripe) && /TRIAL_PERIOD_DAYS/.test(stripe), "the checkout takes its trial from the offer file");
ok(!/const TRIAL_(PERIOD_)?DAYS\s*=/.test(stripe), "the checkout keeps no trial length of its own");
ok(!/trial_period_days\s*:\s*\d/.test(stripe), "no number is written into trial_period_days by hand");

const SKIP = /node_modules|\.next|[\\/](seed|seeds|fixtures|generated|__tests__)[\\/]|\.test\./i;
const walk = (d) => readdirSync(d).flatMap((n) => { const f = join(d, n); if (SKIP.test(f)) return []; const s = statSync(f); return s.isDirectory() ? walk(f) : /\.(tsx?|jsx?|mjs)$/.test(n) ? [f] : []; });
const code = walk(join(ROOT, "src")).map((f) => [relative(ROOT, f).split(sep).join("/"), readFileSync(f, "utf8")]);
const others = code.filter(([p]) => p !== OFFER && p !== STRIPE);
ok(!others.some(([, t]) => /trial_period_days|trialPeriodDays/.test(t)), "no other code gives Stripe a trial length");
ok(!code.some(([, t]) => /subscriptions\.update\([\s\S]{0,400}trial_end|trial_end\s*:\s*(?!null)/.test(t)), "no code sets trial_end on a subscription (a running 7-day trial is never cut)");
ok(!others.some(([, t]) => /\bTRIAL_PERIOD_DAYS\b|\bTRIAL_HOURS\b/.test(t) && /Date|getTime|setDate|addDays/.test(t)), "no code derives a trial end from the offer number");
ok(code.some(([, t]) => /\.trial_end\b|current_period_end/.test(t)), "trial and paid access come from Stripe's own dates (trial_end / current_period_end)");

/* the customer-facing lines: app code and copy under src/ and public/, exam material excluded */
const COPY_SKIP = /node_modules|\.next|[\\/](seed|seeds|fixtures|generated|__tests__|universities)[\\/]|[\\/]content[\\/](reading|listening|writing|speaking|exam|bank|items|questions|passages|scripts)[\\/]|\.test\./i;
const BANNED = /\b7[- ]day\b|\bseven[- ]day\b|7 days? free|\b7 days\b[^.]{0,40}\btrial|trial[^.]{0,40}\b7 days\b|monthly only|monthly-only|\bno (free )?trial\b|first 7 days|7 day free trial/i;
const copyWalk = (d) => !existsSync(d) ? [] : readdirSync(d).flatMap((n) => { const f = join(d, n); if (COPY_SKIP.test(f)) return []; const s = statSync(f); return s.isDirectory() ? copyWalk(f) : /\.(tsx?|jsx?|mjs|json|md|mdx|html|txt)$/.test(n) ? [f] : []; });
const ALLOW = existsSync(join(ROOT, "scripts/gates/offer-48h.allow.json")) ? JSON.parse(read("scripts/gates/offer-48h.allow.json")) : [];
const left = [];
for (const f of ["src", "public"].flatMap((d) => copyWalk(join(ROOT, d)))) {
  const p = relative(ROOT, f).split(sep).join("/");
  readFileSync(f, "utf8").split(/\r?\n/).forEach((l, i) => { if (BANNED.test(l) && !ALLOW.some((a) => a.file === p && l.includes(a.text))) left.push(`${p}:${i + 1}: ${l.trim().slice(0, 140)}`); });
}
ok(left.length === 0, `no customer-facing line sells a 7-day trial, "monthly only" or "no trial" (${left.length} left)`);
for (const l of left.slice(0, 30)) console.log(`      ${l}`);
console.log(fails.length ? `\nOFFER GATE FAIL (${fails.length})` : "\nOFFER GATE PASS");
process.exitCode = fails.length ? 1 : 0;
