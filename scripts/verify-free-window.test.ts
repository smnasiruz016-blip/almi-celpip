// THE 3-DAY NO-CARD WINDOW, PROVED BY CAPABILITY.
//
//   npx tsx scripts/verify-free-window.test.ts
//
// Offline. No database, no network, no model call.
//
// ── WHY THIS TEST IS SHAPED THE WAY IT IS ────────────────────────────────────
// On 2026-08-18 AlmiPrep shipped this exact feature and deadlocked production. The
// start gate refused before the attempt existed, so the clock was never set, so it
// refused forever: all 27 users sat at freeAccessStartedAt = NULL and could do nothing.
// AlmiPrep's own gate was GREEN throughout, because it asserted what each state was
// CALLED — "an expired window is refused", "a fresh window is active" — and never once
// asked the only question that matters:
//
//     CAN A BRAND-NEW USER, WITH NO SUBSCRIPTION AND NO WINDOW, ACTUALLY START?
//
// So every assertion below is phrased as a capability: canStartListening(user),
// canStartReading(user), canStartWriting(user). If the predicates are renamed or
// rewired, these still describe what a person can do.
//
// Coverage is LISTENING and READING only. Writing, Speaking and the mock stay
// card-first, because each calls a paid model to produce its result — the line is
// COST, not generosity.

import {
  hasPaidAccess,
  hasMachineMarkedAccess,
  isFreeWindowActive,
  isFreeWindowExpired,
  isPracticeStartBlocked,
  getAccessLevel,
  FREE_ACCESS_DAYS,
  FREE_WINDOW_SUBTESTS,
  isFreeWindowSubTest,
} from "../src/lib/billing/plans";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

const DAY = 24 * 60 * 60 * 1000;
const base = { email: "learner@example.com", emailVerified: new Date(), compProUntil: null };
const mk = (o: Partial<{ status: string | null; end: Date | null; freeStart: Date | null; verified: boolean; email: string }> = {}) =>
  ({
    ...base,
    email: o.email ?? base.email,
    emailVerified: o.verified === false ? null : new Date(),
    subscriptionStatus: o.status ?? null,
    subscriptionCurrentPeriodEnd: o.end ?? null,
    freeAccessStartedAt: o.freeStart ?? null,
  }) as never;

// ── CAPABILITY, expressed exactly as the start routes will ask it ────────────
const canStart = (user: never, subTest: "LISTENING" | "READING" | "WRITING" | "SPEAKING") =>
  isFreeWindowSubTest(subTest) ? !isPracticeStartBlocked(user) : hasPaidAccess(user);
const canStartListening = (u: never) => canStart(u, "LISTENING");
const canStartReading = (u: never) => canStart(u, "READING");
const canStartWriting = (u: never) => canStart(u, "WRITING");
const canStartSpeaking = (u: never) => canStart(u, "SPEAKING");

console.log("1. THE DEADLOCK — a brand-new user must be able to BEGIN");
const brandNew = mk();                       // verified, no subscription, no window
check("a never-started user CAN start Listening", canStartListening(brandNew),
  "this is the 2026-08-18 regression: never-started is not a refusal");
check("a never-started user CAN start Reading", canStartReading(brandNew));
check("...and their window is genuinely unset", (brandNew as { freeAccessStartedAt: Date | null }).freeAccessStartedAt === null);
check("...and they are NOT counted as paid", !hasPaidAccess(brandNew));

console.log("\n2. COVERAGE — Listening and Reading only");
check(`FREE_WINDOW_SUBTESTS is exactly LISTENING+READING`,
  [...FREE_WINDOW_SUBTESTS].sort().join(",") === "LISTENING,READING", [...FREE_WINDOW_SUBTESTS].join(","));
check("a never-started user CANNOT start Writing", !canStartWriting(brandNew), "Writing calls a paid model");
check("a never-started user CANNOT start Speaking", !canStartSpeaking(brandNew), "Speaking calls a paid model");

console.log("\n3. AN OPEN WINDOW");
const open = mk({ freeStart: new Date() });
check("open window: CAN start Listening", canStartListening(open));
check("open window: still CANNOT start Writing", !canStartWriting(open));
check("open window does NOT grant paid access", !hasPaidAccess(open));
check("open window is active", isFreeWindowActive(open));
check("open window is not expired", !isFreeWindowExpired(open));

console.log("\n4. AN EXPIRED WINDOW — the only population refused");
const expired = mk({ freeStart: new Date(Date.now() - (FREE_ACCESS_DAYS + 1) * DAY) });
check("expired: CANNOT start Listening", !canStartListening(expired));
check("expired: CANNOT start Reading", !canStartReading(expired));
check("expired is expired", isFreeWindowExpired(expired));
check("expired is not active", !isFreeWindowActive(expired));

console.log("\n5. A PAYING USER IS NEVER REFUSED WHAT A FREE USER IS GIVEN");
const paid = mk({ status: "active", end: new Date(Date.now() + 30 * DAY) });
const paidExpiredWindow = mk({ status: "active", end: new Date(Date.now() + 30 * DAY), freeStart: new Date(Date.now() - 99 * DAY) });
check("paid: CAN start Listening", canStartListening(paid));
check("paid: CAN start Writing", canStartWriting(paid));
check("paid WITH a long-expired window can still start Listening", canStartListening(paidExpiredWindow),
  "the superset rule — hasMachineMarkedAccess must never refuse a payer");
check("hasMachineMarkedAccess is a SUPERSET of hasPaidAccess", hasMachineMarkedAccess(paid) && hasMachineMarkedAccess(paidExpiredWindow));
const trialing = mk({ status: "trialing", end: new Date(Date.now() + 7 * DAY) });
check("a card trial counts as paid from minute one", hasPaidAccess(trialing) && canStartWriting(trialing));

console.log("\n6. VERIFIED EMAIL IS REQUIRED ON BOTH PATHS");
const unverifiedFree = mk({ verified: false, freeStart: new Date() });
const unverifiedPaid = mk({ verified: false, status: "active", end: new Date(Date.now() + 30 * DAY) });
check("unverified + open window: no machine-marked access", !hasMachineMarkedAccess(unverifiedFree));
check("unverified + active subscription: no paid access", !hasPaidAccess(unverifiedPaid));

console.log("\n7. THE FOUR LEVELS ARE DISTINGUISHABLE");
check("never started -> NONE", getAccessLevel(brandNew) === "NONE", getAccessLevel(brandNew));
check("open window -> FREE_3DAY", getAccessLevel(open) === "FREE_3DAY", getAccessLevel(open));
check("expired -> FREE_EXPIRED (not NONE)", getAccessLevel(expired) === "FREE_EXPIRED", getAccessLevel(expired));
check("paid -> PAID", getAccessLevel(paid) === "PAID", getAccessLevel(paid));
check(`the window is ${FREE_ACCESS_DAYS} days`, FREE_ACCESS_DAYS === 3, String(FREE_ACCESS_DAYS));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
