// Full mock start page. CELPIP-General runs all four skills in test order
// (Listening → Reading → Writing → Speaking); CELPIP-General LS runs only
// Listening → Speaking. Each skill is scored independently on the CLB scale. The
// mock includes AI tasks, so it needs a subscription and a chosen version.

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPaidAccess } from "@/lib/billing/plans";
import { startSession } from "@/lib/celpip/session";

async function startMockAction() {
  "use server";
  const user = await requireUser();
  if (!hasPaidAccess(user)) redirect("/pricing");
  if (!user.targetVersion) redirect("/account?needversion=1");
  const id = await startSession({
    userId: user.id,
    mode: "MOCK",
    version: user.targetVersion,
  });
  if (!id) redirect("/practice?mockempty=1");
  redirect(`/practice/session/${id}`);
}

export default async function MockStartPage() {
  const user = await requireUser();
  const needsPaid = !hasPaidAccess(user);
  const needsVersion = !user.targetVersion;

  // Offer to resume an unfinished mock rather than always starting fresh.
  const inProgress =
    needsPaid || needsVersion
      ? null
      : await prisma.celpipSession.findFirst({
          where: { userId: user.id, mode: "MOCK", status: "IN_PROGRESS" },
          orderBy: { startedAt: "desc" },
          select: { id: true, currentStep: true, targetCount: true },
        });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">AlmiCELPIP</p>
      <h1 className="text-3xl font-semibold text-almi-ink">Full mock</h1>
      <p className="text-base text-almi-text">
        A full-length practice run in CELPIP order, in one sitting. CELPIP-General covers all four
        skills — Listening, Reading, Writing (Email + Survey) and Speaking (8 tasks). CELPIP-General LS
        covers only Listening and Speaking. We run whichever version you chose in your account.
      </p>

      <div className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-5 text-sm text-almi-text">
        <p>
          At the end you get an honest CLB estimate for each skill — shown as a range, not a single
          number. There is no overall score: CELPIP reports each skill on its own, so we don&apos;t
          invent a composite. Confirm the CLB you need with IRCC.
        </p>
      </div>

      {needsVersion ? (
        <div className="rounded-xl border border-almi-accent/40 bg-almi-accent/10 px-4 py-3 text-sm text-almi-ink">
          Choose which CELPIP version you&apos;re preparing for first (General or General LS).{" "}
          <a href="/account" className="font-semibold underline">
            Set your version
          </a>
          .
        </div>
      ) : needsPaid ? (
        <div className="rounded-xl border border-almi-accent/40 bg-almi-accent/10 px-4 py-3 text-sm text-almi-ink">
          The full mock includes AI feedback and is part of a subscription.{" "}
          <a href="/pricing" className="font-semibold underline">
            See plans
          </a>
          .
        </div>
      ) : (
        <div className="space-y-3">
          {inProgress && (
            <div className="rounded-xl border border-almi-teal/30 bg-almi-teal/5 px-4 py-4">
              <p className="text-sm font-semibold text-almi-ink">
                You have a mock in progress — step {inProgress.currentStep + 1} of{" "}
                {inProgress.targetCount}.
              </p>
              <Link
                href={`/practice/session/${inProgress.id}`}
                className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full bg-almi-teal px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Resume mock →
              </Link>
            </div>
          )}
          <form action={startMockAction}>
            <button
              type="submit"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep"
            >
              {inProgress ? "Start a new mock →" : "Begin full mock →"}
            </button>
          </form>
        </div>
      )}

      <p className="text-xs text-almi-text-muted">
        Original to AlmiCELPIP — never copied from CELPIP. Results are a practice estimate, not an official
        Canadian English Language Proficiency Index Program result.
      </p>
    </div>
  );
}
