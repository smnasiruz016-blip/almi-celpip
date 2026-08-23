import type { User } from "@prisma/client";
import { isOwner } from "@/lib/auth/owner-check";

// Price IDs are sourced from env — founder sets them in Vercel after creating
// the "AlmiCELPIP Pro" product in the shared AlmiWorld Stripe account.
// Until set, billing is disabled at runtime by isBillingEnabled().
export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY ?? "";

// One paid plan. The network law is $12/month with a 7-day trial and nothing else,
// so there is no yearly key to be dormant about.
export type PlanKey = "FREE" | "PRO_MONTHLY";

export type PlanConfig = {
  /** Practice attempts per month — Infinity = unlimited. */
  attemptsPerMonth: number;
  /** AI-evaluated productive tasks per month — Infinity = unlimited. */
  aiEvaluationsPerMonth: number;
  /** Access to all DET task types vs. a limited preview. */
  allTasks: boolean;
};

export const PLANS: Record<PlanKey, PlanConfig> = {
  FREE: {
    attemptsPerMonth: 3,
    aiEvaluationsPerMonth: 1,
    allTasks: false,
  },
  PRO_MONTHLY: {
    attemptsPerMonth: Infinity,
    aiEvaluationsPerMonth: Infinity,
    allTasks: true,
  },
};

export const PLAN_DISPLAY_NAME: Record<PlanKey, string> = {
  FREE: "Free",
  PRO_MONTHLY: "Pro Monthly",
};

const ACTIVE_STATUSES = new Set(["trialing", "active"]);
const DAY_MS = 24 * 60 * 60 * 1000;

type ProUserShape = Pick<
  User,
  "subscriptionStatus" | "subscriptionCurrentPeriodEnd" | "compProUntil"
>;

/** True while an admin comp grant is active (compProUntil in the future). */
export function isComped(user: Pick<User, "compProUntil">): boolean {
  return user.compProUntil !== null && user.compProUntil.getTime() > Date.now();
}

/** Whole days left on an active comp grant (ceil), or null if not comped. */
export function getCompProDaysRemaining(
  user: Pick<User, "compProUntil">,
): number | null {
  if (!isComped(user)) return null;
  return Math.ceil((user.compProUntil!.getTime() - Date.now()) / DAY_MS);
}

/**
 * True when the user has Pro access right now — an active comp grant, or a
 * paid / trialing subscription still inside its period. Comp short-circuits
 * first, before any Stripe state is consulted.
 */
export function isProActive(user: ProUserShape): boolean {
  if (isComped(user)) return true;
  if (!user.subscriptionStatus) return false;
  if (!ACTIVE_STATUSES.has(user.subscriptionStatus)) return false;
  if (!user.subscriptionCurrentPeriodEnd) return false;
  return user.subscriptionCurrentPeriodEnd.getTime() > Date.now();
}

/** Email verification check. Paid features require both verified email AND
 *  active subscription — see hasPaidAccess(). */
export function isEmailVerified(user: Pick<User, "emailVerified">): boolean {
  return user.emailVerified !== null;
}

/** Gate for paid features: an OWNER always has access; otherwise requires an
 *  active subscription AND verified email. Owner override is the single
 *  chokepoint — every free-tier limit (objective + productive DET tasks) and
 *  the "free plan" UI banner derive from this. */
export function hasPaidAccess(
  user: ProUserShape & Pick<User, "emailVerified" | "email">,
): boolean {
  // Owner and comp both grant immediate full access — they bypass the email
  // verification a normal paid subscription still requires.
  if (isOwner(user.email) || isComped(user)) return true;
  return isProActive(user) && isEmailVerified(user);
}

export function getUserPlan(
  user: ProUserShape & Pick<User, "subscriptionPlan">,
): PlanKey {
  if (!isProActive(user)) return "FREE";
  return "PRO_MONTHLY";
}

/**
 * Convert a Stripe Price ID to our internal plan label. Server-side
 * validation: any priceId outside this map is rejected at the checkout API.
 */
export function priceIdToPlanLabel(
  priceId: string,
): "pro_monthly" | null {
  if (priceId && priceId === STRIPE_PRICE_MONTHLY) return "pro_monthly";
  return null;
}

/**
 * Billing is enabled when Stripe is actually configured — a real secret key AND
 * a monthly price id. Both are RUNTIME (non-NEXT_PUBLIC) env vars, so this
 * reflects the deployment's current env immediately and is NOT frozen into the
 * build. (Previously this also gated on NEXT_PUBLIC_BILLING_ENABLED, which is
 * inlined at build time and so required a fresh, no-cache rebuild every time —
 * the build-cache trap. Dropping it removes that footgun: set the Stripe env
 * vars and any redeploy turns billing on.)
 *
 * AlmiCELPIP ships a single $12/month plan. The yearly scaffolding used to sit here
 * dormant, justified by STRIPE_PRICE_YEARLY being "" — which was true, and is exactly
 * the kind of dead branch that stops being dormant the day someone sets the env var.
 * The network law is monthly only, so the key is gone rather than disabled.
 */
function isRealEnv(v: string | undefined): boolean {
  return Boolean(v && v.trim() && v !== "TODO_FOUNDER_PROVIDES");
}

export function isBillingEnabled(): boolean {
  return (
    isRealEnv(process.env.STRIPE_SECRET_KEY) &&
    isRealEnv(process.env.STRIPE_PRICE_ID_MONTHLY)
  );
}

// ===================== 3-day no-card free window =====================
//
// Network law, settled 23 Aug 2026: $12/month with a 7-day CARD-FIRST trial, PLUS a
// 3-day NO-CARD window that covers LISTENING and READING ONLY.
//
// The coverage line is COST, not generosity. Writing and Speaking each call a paid
// model to produce their result, and the Listening audio is pre-rendered rather than
// synthesised per request — so the two skills in the window are the two that can be
// served for nothing.
//
// ── THE SCAR TISSUE, PORTED DELIBERATELY ────────────────────────────────────────
// AlmiPrep shipped this on 2026-08-18 and deadlocked production. Its start gate asked
// "may this user practise right now" instead of "may this user BEGIN", so it refused
// before the attempt existed; the clock is set BY starting, so it was never set; so it
// refused forever. All 27 users sat at freeAccessStartedAt = NULL and could do nothing,
// and the gate was green the whole time because it asserted what each state was CALLED.
//
// "NEVER STARTED" IS NOT A REFUSAL. Three predicates, three different questions, and
// they must never be interchanged:
//
//   hasPaidAccess()          owner ‖ comp ‖ (active subscription AND verified email)
//   hasMachineMarkedAccess() deliberately a SUPERSET — a paying user must never be
//                            refused something a free user is given
//   isPracticeStartBlocked() refuses ONLY a non-paying user whose window has EXPIRED

export const FREE_ACCESS_DAYS = 3;

/** The only sub-tests the no-card window covers. */
export const FREE_WINDOW_SUBTESTS = new Set(["LISTENING", "READING"] as const);

export function isFreeWindowSubTest(subTest: string): boolean {
  return FREE_WINDOW_SUBTESTS.has(subTest as "LISTENING" | "READING");
}

export type FreeUserShape = Pick<User, "freeAccessStartedAt">;

export function isFreeWindowActive(user: FreeUserShape): boolean {
  if (!user.freeAccessStartedAt) return false;
  return user.freeAccessStartedAt.getTime() + FREE_ACCESS_DAYS * DAY_MS > Date.now();
}

/** Whole days left, or null if the window is not running. Null covers BOTH "not
 *  started" and "expired" — callers that must tell those apart read getAccessLevel(). */
export function getFreeAccessDaysRemaining(user: FreeUserShape): number | null {
  if (!isFreeWindowActive(user)) return null;
  const endsAt = user.freeAccessStartedAt!.getTime() + FREE_ACCESS_DAYS * DAY_MS;
  return Math.ceil((endsAt - Date.now()) / DAY_MS);
}

/** True ONLY when a window was started and has since run out. */
export function isFreeWindowExpired(user: FreeUserShape): boolean {
  return Boolean(user.freeAccessStartedAt) && !isFreeWindowActive(user);
}

/** May they practise a covered sub-test RIGHT NOW? A superset of hasPaidAccess by
 *  construction — a payer is never refused something a free user is given. The free
 *  path still requires a verified email: the same bar as the paid path. */
export function hasMachineMarkedAccess(
  user: ProUserShape & FreeUserShape & Pick<User, "emailVerified" | "email">,
): boolean {
  if (hasPaidAccess(user)) return true;
  return isFreeWindowActive(user) && isEmailVerified(user);
}

/** THE START GATE. Refuses exactly one population: a non-paying user whose window has
 *  EXPIRED. A user with no window yet falls through — starting is how they get one.
 *  Do NOT substitute hasMachineMarkedAccess() here; that is the 18 Aug regression. */
export function isPracticeStartBlocked(
  user: ProUserShape & FreeUserShape & Pick<User, "emailVerified" | "email">,
): boolean {
  if (hasPaidAccess(user)) return false;
  return isFreeWindowExpired(user);
}

export type AccessLevel = "NONE" | "FREE_3DAY" | "FREE_EXPIRED" | "PAID";

/** Four states, and the one the UI keeps confusing with NONE: a user whose window ran
 *  out is not the same as one who never started, and the upgrade copy differs. */
export function getAccessLevel(
  user: ProUserShape & FreeUserShape & Pick<User, "emailVerified" | "email">,
): AccessLevel {
  if (hasPaidAccess(user)) return "PAID";
  if (hasMachineMarkedAccess(user)) return "FREE_3DAY";
  if (isFreeWindowExpired(user)) return "FREE_EXPIRED";
  return "NONE";
}
