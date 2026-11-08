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
// RR-397: aiGate() is the free-48-hours door for AI (paid, or ONE scoring of a kind inside
// the free 48 hours within today's free-AI budget), so it is a payment gate too.
const GATE_TOKENS =
  /\b(aiGate|hasPaidAccess|isProActive|hasFullAccess|hasMachineMarkedAccess|isPracticeStartBlocked|isAdmin|isOwner|requireAdmin|ADMIN_API_SECRET)\b/;

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
// across every $12/month product and it is what merged main said at all eight sites.
// RR-394 (owner decision, Nov 2026) replaced the offer family-wide with "Try free for
// 48 hours, then $12/month. Cancel anytime." — so the standard CTA is now "Try free for
// 48 hours", and the old 7-day CTA (either wording) is an off-standard VARIANT that must
// not come back. The gate asserts the same six sites; only the expected words changed.
// RR-397 (owner decision 8 Nov 2026): "Try free for 48 hours, no card. Then $12/month. Cancel
// anytime." The sign-up CTA stays "Try free for 48 hours" at five sites; the logged-in checkout
// button no longer starts anything free, it reads "Unlock for $12/month" (the free 48 hours
// start at sign-up, with no card). Same six sites, each with the words it must now say.
const CTA = "Try free for 48 hours";
const UNLOCK = "Unlock for $12/month";
const VARIANT = /Start (your )?7-day free trial|Start practising free|Practise free/i;
const ctaSites: [string, string, string][] = [
  ["GlobalHeader", header, CTA], ["HeaderMobileMenu", mobile, CTA],
  ["pricing page", pricingPage, CTA], ["PricingCheckoutButton", checkoutBtn, UNLOCK],
  ["landing page", read("src/app/page.tsx"), CTA], ["seo kit", read("src/components/celpip-seo/kit.tsx"), CTA],
];
for (const [name, src, want] of ctaSites) {
  check(src.includes(want), `${name} CTA reads "${want}"`,
    (src.match(/Start[^"'<>{}]{0,40}(free|practising|trial)[^"'<>{}]{0,20}/i) ?? ["no Start… CTA found"])[0]);
  check(!VARIANT.test(src), `${name} uses no off-standard CTA variant`,
    (src.match(VARIANT) ?? [""])[0]);
}
// No CTA anywhere may still promise free practice without a card on the paid path.
const contradictions = ctaSites.filter(([, s]) => /Start practising free|Practise free|Free forever/i.test(s));
check(contradictions.length === 0, "no CTA promises free practice beyond the free 48 hours and the 3-day window",
  contradictions.map(([n]) => n).join(", "));

check(/\$?12\b/.test(pricingPage) || /1200/.test(plans + pricingPage), "$12/month appears in the pricing copy");
// RR-394 asserted a 48-hour CARD trial here. RR-397 (owner decision 8 Nov 2026) replaced it:
// the free 48 hours start at sign-up with no card, and a new checkout carries NO trial at all
// (Stripe charges $12 at checkout, then monthly). So this now asserts the offer is CONFIGURED
// that way — the offer file is 48 hours with the owner's words, trialForNewCheckout() returns
// {}, the checkout spreads it and names no trial in code — and that the pricing page says so.
const offerFile = read("src/lib/billing/offer.ts");
const stripeFile = read("src/lib/billing/stripe.ts");
check(/export const TASTE_HOURS = 48;/.test(offerFile)
    && /OFFER_LINE = "Try free for 48 hours, no card\. Then \$12\/month\. Cancel anytime\.";/.test(offerFile)
    && /trialForNewCheckout\(\): Record<string, never> \{\s*return \{\};/.test(offerFile)
    && /from "\.\/offer"/.test(stripeFile) && /\.\.\.trialForNewCheckout\(\)/.test(stripeFile)
    && !/trial_period_days|trial_end|trial_from_plan/.test(stripComments(stripeFile)),
  "free 48 hours with no card are configured, and a new checkout hands Stripe no trial");
check(/48 hours, no card/i.test(pricingPage) && !/7[- ]day/i.test(pricingPage) && !/48-hour trial/i.test(pricingPage),
  "the pricing page describes the free 48 hours with no card, and no card trial");
check(!/payment_method_collection\s*:\s*["']if_required["']/.test(checkoutRoute),
  "the checkout takes a card — payment_method_collection is not 'if_required'",
  "Stripe defaults to 'always'; the $12 is charged at checkout");
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
