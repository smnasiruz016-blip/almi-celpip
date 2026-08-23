import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { isBillingEnabled } from "@/lib/billing/plans";
// Family GlobalHeader + GlobalFooter come from the root layout.
import { PricingCheckoutButton } from "./PricingCheckoutButton";

export const metadata: Metadata = {
  title: "Pricing — 7-day free trial",
  description:
    "AlmiCELPIP Pro — $12/month, cancel anytime. 7-day free trial. Honest AI feedback on CELPIP Writing and Speaking, full-length practice, and per-skill estimates on the CLB 1–12 scale.",
};

const FEATURES = [
  "Honest AI feedback on CELPIP Writing and Speaking tasks",
  "Full-length practice across all four skills",
  "Per-skill estimates on the CLB 1–12 scale, shown as ranges (never a fabricated overall)",
  "Adaptive practice that adjusts to your level",
  "Original material — never copied from CELPIP",
  "Cancel anytime from your account",
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const billingLive = isBillingEnabled();

  return (
    <div className="flex flex-1 flex-col bg-almi-bg">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-almi-ink">Simple pricing. 7-day free trial.</h1>
          <p className="mt-3 text-base text-almi-text-muted">
            One subscription. Honest AI feedback and full-length practice. Cancel anytime.
          </p>
        </div>

        {params.cancelled && (
          <p className="mx-auto mt-6 max-w-md rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3 text-center text-sm text-almi-text">
            Checkout cancelled. You can try again whenever you&apos;re ready.
          </p>
        )}

        {!billingLive && (
          <p className="mx-auto mt-6 max-w-md rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3 text-center text-sm text-almi-text-muted">
            Billing is in setup. Trial signups open shortly — leave your email on the homepage to be notified.
          </p>
        )}

        <div className="mx-auto mt-10 grid max-w-md gap-6">
          <PlanCard
            name="Pro"
            price="$12"
            period="/month"
            blurb="One subscription. Cancel anytime."
            features={FEATURES}
            plan="monthly"
            isLoggedIn={Boolean(user)}
            billingLive={billingLive}
            featured
          />
        </div>

        <p className="mt-10 text-center text-xs text-almi-text-muted">
          Card not charged during the 7-day trial. Cancel from your account before the trial ends and pay nothing.
        </p>
      </main>
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  blurb,
  features,
  plan,
  isLoggedIn,
  billingLive,
  featured,
}: {
  name: string;
  price: string;
  period: string;
  blurb: string;
  features: string[];
  plan: "monthly" | "yearly";
  isLoggedIn: boolean;
  billingLive: boolean;
  featured?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border bg-almi-paper p-8 shadow-sm " +
        (featured ? "border-almi-coral/40 ring-2 ring-almi-coral/20" : "border-almi-bg-peach")
      }
    >
      {featured && (
        <p className="mb-3 inline-block rounded-md bg-almi-coral px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-almi-ink">
          Best value
        </p>
      )}
      <h2 className="text-xl font-semibold text-almi-ink">{name}</h2>
      <p className="mt-2">
        <span className="text-4xl font-bold text-almi-ink">{price}</span>
        <span className="text-almi-text-muted">{period}</span>
      </p>
      <p className="mt-2 text-sm text-almi-text-muted">{blurb}</p>

      <ul className="mt-6 space-y-2 text-sm text-almi-text">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-almi-teal" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {!isLoggedIn ? (
          <Link
            href={`/signup?next=${encodeURIComponent(`/pricing?plan=${plan}`)}`}
            className="inline-flex w-full min-h-[44px] items-center justify-center bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep"
            style={{ borderRadius: 9999 }}
          >
            Start 7-day free trial
          </Link>
        ) : (
          <PricingCheckoutButton plan={plan} disabled={!billingLive} />
        )}
      </div>
    </div>
  );
}
