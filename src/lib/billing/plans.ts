import type { User } from "@prisma/client";
import { isOwner } from "@/lib/auth/owner-check";

// Price IDs are sourced from env — founder sets them in Vercel after creating
// the "AlmiCELPIP Pro" product in the shared AlmiWorld Stripe account.
// Until set, billing is disabled at runtime by isBillingEnabled().
export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY ?? "";
export const STRIPE_PRICE_YEARLY = process.env.STRIPE_PRICE_ID_YEARLY ?? "";

export type PlanKey = "FREE" | "PRO_MONTHLY" | "PRO_YEARLY";

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
  PRO_YEARLY: {
    attemptsPerMonth: Infinity,
    aiEvaluationsPerMonth: Infinity,
    allTasks: true,
  },
};

export const PLAN_DISPLAY_NAME: Record<PlanKey, string> = {
  FREE: "Free",
  PRO_MONTHLY: "Pro Monthly",
  PRO_YEARLY: "Pro Yearly",
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
  if (user.subscriptionPlan === "pro_yearly") return "PRO_YEARLY";
  return "PRO_MONTHLY";
}

/**
 * Convert a Stripe Price ID to our internal plan label. Server-side
 * validation: any priceId outside this map is rejected at the checkout API.
 */
export function priceIdToPlanLabel(
  priceId: string,
): "pro_monthly" | "pro_yearly" | null {
  if (priceId && priceId === STRIPE_PRICE_MONTHLY) return "pro_monthly";
  if (priceId && priceId === STRIPE_PRICE_YEARLY) return "pro_yearly";
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
 * AlmiCELPIP ships a single $12/month plan — there is no yearly price, so the
 * yearly scaffolding stays dormant (STRIPE_PRICE_YEARLY === "" makes
 * priceIdToPlanLabel + the checkout allowlist reject any "yearly" request).
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
