// THE SPEND GATE AND THE PAYWALL LAW, ENUMERATED.
//
//   npx tsx scripts/verify-spend-gate.ts
//
// Offline. No database, no network, no model call.
//
// Ported from AlmiPrep's verify-practice-gate.ts Section F, together with the three
// mistakes that section made and had to be corrected:
//
//   1. Testing the gate token against the WHOLE FILE passed a deliberately sabotaged
//      route: replacing `if (!hasPaidAccess(user))` with `if (false)` left the import
//      line behind, and the import alone satisfied the regex. So: strip imports, then
//      require the token in the BODY.
//   2. A gate that runs AFTER the spend is not a gate. Where the spend happens in the
//      route file itself, the gate must appear before it.
//   3. Matching raw source counted a vendor endpoint MENTIONED IN A COMMENT as a
//      spend. On AlmiPTE that produced four false alarms, and the cheapest way to
//      make it green would have been to delete the documentation. So: strip comments.
//
// And the enumeration must be able to find something. If a refactor makes the spend
// patterns match nothing, every per-route assertion passes over an empty set and the
// gate reports ALL PASS while measuring nothing.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
let passed = 0, failed = 0;
function check(ok: boolean, name: string, detail = "") {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Paid vendors only. edge-tts is free and is deliberately absent from this list. */
const SPEND_PATTERNS: [RegExp, string][] = [
  [/api\.openai\.com\/v1\/chat\/completions|chat\.completions\.create/, "OpenAI chat"],
  [/api\.openai\.com\/v1\/audio\/speech|\baudio\.speech\b|["']tts-1(-hd)?["']/, "OpenAI TTS"],
  [/api\.openai\.com\/v1\/audio\/transcriptions|["']whisper-1["']/, "OpenAI Whisper"],
  [/api\.anthropic\.com|messages\.create\s*\(/, "Anthropic"],
];

/** Predicates that actually decide whether a user may spend money. requireUser() is
 *  NOT here: being signed in is not the same as having paid, and treating it as a
 *  gate is how an open paid endpoint reads as protected. */
const GATE_TOKENS =
  /\b(hasPaidAccess|isProActive|hasFullAccess|hasMachineMarkedAccess|isPracticeStartBlocked|isAdmin|isOwner|requireAdmin|ADMIN_API_SECRET)\b/;

function reachable(entry: string): string[] {
  const seen = new Set<string>(); const st = [entry];
  while (st.length) {
    const f = st.pop()!; if (seen.has(f)) continue; seen.add(f);
    let s: string; try { s = readFileSync(f, "utf8"); } catch { continue; }
    for (const re of [/^\s*import\s[^(;]*?\sfrom\s+["']([^"']+)["']/gm, /^\s*import\s+["']([^"']+)["']/gm]) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) !== null) {
        const sp = m[1];
        let base: string | null = null;
        if (sp.startsWith("@/")) base = join(SRC, sp.slice(2));
        else if (sp.startsWith(".")) base = join(f, "..", sp);
        if (!base) continue;
        for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
          if (existsSync(c) && statSync(c).isFile()) { if (!seen.has(c)) st.push(c); break; }
        }
      }
    }
  }
  return [...seen];
}

function gateCallInBody(routeFile: string): { called: boolean; beforeSpend: boolean } {
  const raw = stripComments(readFileSync(routeFile, "utf8"));
  const body = raw.replace(/^\s*import\s[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "");
  const gAt = body.search(GATE_TOKENS);
  if (gAt < 0) return { called: false, beforeSpend: false };
  let firstSpend = -1;
  for (const [re] of SPEND_PATTERNS) {
    const i = body.search(re);
    if (i >= 0 && (firstSpend < 0 || i < firstSpend)) firstSpend = i;
  }
  return { called: true, beforeSpend: firstSpend < 0 || gAt < firstSpend };
}

function spendReason(file: string): string | null {
  let s: string; try { s = readFileSync(file, "utf8"); } catch { return null; }
  const code = stripComments(s);
  for (const [re, why] of SPEND_PATTERNS) if (re.test(code)) return why;
  return null;
}

/** Routes that spend but are not user-gated, each with the reason it may be.
 *  An exemption must be argued in writing. Empty is the correct state today. */
const SPEND_EXEMPT: Record<string, string> = {};

function allRouteFiles(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...allRouteFiles(p));
    else if (e.name === "route.ts") out.push(p);
  }
  return out;
}

const read = (p: string) => { try { return readFileSync(join(ROOT, p), "utf8"); } catch { return ""; } };

// ── CONTROLS, before any finding is reported ────────────────────────────────
console.log("CONTROLS");
check(SPEND_PATTERNS.some(([re]) => re.test(`await openai.chat.completions.create({})`)),
  "spend detector FIRES on a real vendor call");
check(!SPEND_PATTERNS.some(([re]) => re.test(stripComments(`// calls chat.completions.create() somewhere`))),
  "spend detector is SILENT on a vendor named only in a comment");
check(!SPEND_PATTERNS.some(([re]) => re.test(`spawn("python", ["-m", "edge_tts"])`)),
  "spend detector is SILENT on edge-tts (free)");
check(!GATE_TOKENS.test(`const user = await requireUser();`),
  "requireUser() alone does NOT count as a payment gate");
check(GATE_TOKENS.test(`if (!hasPaidAccess(user)) return refuse();`),
  "hasPaidAccess() does count as a payment gate");
if (failed) { console.log("\nCONTROLS FAILED — refusing to report findings."); process.exit(1); }

// ── A. THE SPEND SURFACE ────────────────────────────────────────────────────
console.log("\nA. EVERY ROUTE THAT SPENDS IS GATED BEFORE IT SPENDS");
const allRoutes = allRouteFiles(join(SRC, "app/api"));
check(allRoutes.length > 0, `enumerated the API surface (${allRoutes.length} route files)`);

const spending: { short: string; via: string; why: string; gated: boolean }[] = [];
for (const r of allRoutes) {
  let via: string | null = null, why = "";
  for (const f of reachable(r)) { const reason = spendReason(f); if (reason) { via = f; why = reason; break; } }
  if (!via) continue;
  const g = gateCallInBody(r);
  spending.push({
    short: r.replace(ROOT, "").replace(/\\/g, "/"),
    via: via.replace(ROOT, "").replace(/\\/g, "/"),
    why, gated: g.called && g.beforeSpend,
  });
}
console.log(`     ${spending.length} of ${allRoutes.length} routes reach a paid vendor:`);
for (const s of spending) {
  console.log(`       ${s.gated ? "gated " : SPEND_EXEMPT[s.short] ? "exempt" : "OPEN  "} ${s.short}`);
  console.log(`              spends via ${s.via} (${s.why})`);
}
for (const s of spending) {
  if (SPEND_EXEMPT[s.short]) { check(true, `${s.short} spends but is exempt — ${SPEND_EXEMPT[s.short]}`); continue; }
  check(s.gated, `${s.short} spends money and is gated (via ${s.via}, ${s.why})`);
}
check(spending.length >= 1,
  `the enumeration found spending routes at all — ${spending.length} (a zero would be a broken detector, not a clean product)`);

// ── B. THE PAYWALL LAW, ELEMENT BY ELEMENT ──────────────────────────────────
console.log("\nB. THE PAYWALL LAW");
const plans = read("src/lib/billing/plans.ts");
const pricingPage = read("src/app/pricing/page.tsx");
const checkoutRoute = read("src/app/api/billing/checkout/route.ts");
const checkoutBtn = read("src/app/pricing/PricingCheckoutButton.tsx");
const header = read("src/components/GlobalHeader.tsx");
const mobile = read("src/components/HeaderMobileMenu.tsx");

// THE FAMILY STANDARD, not my preferred wording. PR #8 set "Start 7-day free trial"
// across every $12/month product and it is what merged main says at all eight sites.
// This branch originally changed four of them to "Start your 7-day free trial" — one
// word off the standard — which would have left CELPIP internally inconsistent AND
// divergent from the other products. That change YIELDED on merge, and the gate now
// asserts the shipped standard rather than the variant it used to prefer.
const CTA = "Start 7-day free trial";
const VARIANT = /Start your 7-day free trial|Start practising free|Practise free/i;
const ctaSites: [string, string][] = [
  ["GlobalHeader", header], ["HeaderMobileMenu", mobile],
  ["pricing page", pricingPage], ["PricingCheckoutButton", checkoutBtn],
  ["landing page", read("src/app/page.tsx")], ["seo kit", read("src/components/celpip-seo/kit.tsx")],
];
for (const [name, src] of ctaSites) {
  check(src.includes(CTA), `${name} CTA reads "${CTA}"`,
    (src.match(/Start[^"'<>{}]{0,40}(free|practising|trial)[^"'<>{}]{0,20}/i) ?? ["no Start… CTA found"])[0]);
  check(!VARIANT.test(src), `${name} uses no off-standard CTA variant`,
    (src.match(VARIANT) ?? [""])[0]);
}
// No CTA anywhere may still promise free practice without a card on the paid path.
const contradictions = ctaSites.filter(([, s]) => /Start practising free|Practise free|Free forever/i.test(s));
check(contradictions.length === 0, "no CTA contradicts the card-first trial",
  contradictions.map(([n]) => n).join(", "));

check(/\$?12\b/.test(pricingPage) || /1200/.test(plans + pricingPage), "$12/month appears in the pricing copy");
check(/trial_period_days\s*:\s*7|trialPeriodDays\s*:\s*7|7[- ]day/i.test(checkoutRoute + pricingPage + plans),
  "a 7-day trial is configured, not just described");
check(!/payment_method_collection\s*:\s*["']if_required["']/.test(checkoutRoute),
  "CARD FIRST — payment_method_collection is not 'if_required'",
  "Stripe defaults to 'always'; setting 'if_required' would make the trial card-less");
check(/cancel/i.test(pricingPage), "cancel-anytime is stated on the pricing page");

console.log("\n   PRO_YEARLY is gone:");
// READ CODE, NOT PROSE — the same rule section A already applies to spend detection.
// The first run of this check failed on plans.ts because the COMMENT explaining why
// the yearly plan was removed names PRO_YEARLY. The cheapest way to green would have
// been to delete that comment, which is the documentation, not the defect.
for (const [name, src] of [["plans.ts", plans], ["checkout route", checkoutRoute], ["pricing page", pricingPage]] as [string, string][]) {
  check(!/PRO_YEARLY|STRIPE_PRICE_YEARLY|priceYearly/.test(stripComments(src)), `${name} has no yearly plan in code`);
}

console.log("\n   The 3-day no-card window:");
check(/FREE_ACCESS_DAYS\s*=\s*3/.test(plans), "FREE_ACCESS_DAYS is 3");
check(/FREE_WINDOW_SUBTESTS/.test(plans) && /"LISTENING"/.test(plans) && /"READING"/.test(plans),
  "the window names LISTENING and READING");
check(!/FREE_WINDOW_SUBTESTS[\s\S]{0,120}(WRITING|SPEAKING)/.test(plans),
  "WRITING and SPEAKING are NOT in the window — each calls a paid model");
const freeWindow = read("src/lib/billing/free-window.ts");
check(/isPracticeStartBlocked/.test(freeWindow) && /freeAccessStartedAt: null/.test(freeWindow),
  "the start path refuses first and sets the clock second, conditionally on NULL");
check(!/return\s+!hasMachineMarkedAccess\(user\)/.test(plans),
  "isPracticeStartBlocked is not !hasMachineMarkedAccess — that is the 2026-08-18 deadlock");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
