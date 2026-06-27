// Task start page: opens a practice session for the task and routes into it.
// Objective tasks (Listening/Reading) run a short practice set and are free; AI
// tasks (Writing/Speaking) run a single item and need a subscription. CELPIP has
// no profession axis, so no per-profession routing is needed.

import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { hasPaidAccess } from "@/lib/billing/plans";
import { startSession } from "@/lib/celpip/session";
import { taskBySlug } from "@/lib/celpip/registry";
import { SUBTEST_LABEL } from "@/lib/celpip/types";

async function beginAction(formData: FormData) {
  "use server";
  const slug = String(formData.get("slug") ?? "");
  const def = taskBySlug(slug);
  if (!def || !def.live) redirect("/practice");
  const user = await requireUser();
  if (def.scoringMode === "AI" && !hasPaidAccess(user)) redirect("/pricing");
  const id = await startSession({
    userId: user.id,
    mode: "PRACTICE_SET",
    taskType: def.taskType,
  });
  if (!id) redirect(`/practice/${def.slug}?empty=1`);
  redirect(`/practice/session/${id}`);
}

export default async function TaskStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ task: string }>;
  searchParams: Promise<{ empty?: string }>;
}) {
  const user = await requireUser();
  const { task } = await params;
  const { empty } = await searchParams;
  const def = taskBySlug(task);
  if (!def || !def.live) notFound();

  const isObjective = def.scoringMode === "DETERMINISTIC";
  const needsPaid = def.scoringMode === "AI" && !hasPaidAccess(user);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">
        AlmiCELPIP · {SUBTEST_LABEL[def.subTest]}
      </p>
      <h1 className="text-3xl font-semibold text-almi-ink">{def.label}</h1>
      <p className="text-base text-almi-text">{def.blurb}</p>

      <div className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-5 text-sm text-almi-text">
        <p>
          <span className="font-semibold text-almi-ink">Scoring:</span>{" "}
          {isObjective ? "auto-marked instantly" : "honest AI trait feedback"}, turned into a practice
          CLB estimate for {SUBTEST_LABEL[def.subTest]}. Confirm the CLB you need with IRCC.
        </p>
      </div>

      {empty && (
        <p className="rounded-xl border border-almi-coral/40 bg-almi-coral/5 px-4 py-3 text-sm text-almi-coral-deep">
          No practice items are seeded for this task yet.
        </p>
      )}

      {needsPaid ? (
        <div className="rounded-xl border border-almi-accent/40 bg-almi-accent/10 px-4 py-3 text-sm text-almi-ink">
          AI feedback on Writing and Speaking is part of a subscription.{" "}
          <a href="/pricing" className="font-semibold underline">
            See plans
          </a>{" "}
          — Listening and Reading practice is free.
        </div>
      ) : (
        <form action={beginAction}>
          <input type="hidden" name="slug" value={def.slug} />
          <button
            type="submit"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep"
          >
            Begin practice →
          </button>
        </form>
      )}

      <p className="text-xs text-almi-text-muted">
        Original to AlmiCELPIP — never copied from CELPIP. Results are a practice estimate, not an official
        Canadian English Language Proficiency Index Program result.
      </p>
    </div>
  );
}
