// Session driver: walks the user through a practice set or the full mock.
// IN_PROGRESS step → composer; SCORED step → per-step result + advance; all
// steps done → the aggregate result. Advancing is an explicit server action.
// RR-418 · a full Listening or Reading test runs the same way, part by part in its stored order, with its official-window countdown;
// when the time is up the test ends (finishFullTest).

import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSessionView, advanceSession, fullTestPlanOf, fullTestSecondsLeft, finishFullTest } from "@/lib/celpip/session";
import { CELPIP_TASKS } from "@/lib/celpip/registry";
import { CelpipComposer } from "@/components/celpip/composer-map";
import { CelpipResult } from "@/components/celpip/CelpipResult";
import { CelpipSessionResult } from "@/components/celpip/CelpipSessionResult";
import { MockProgress } from "@/components/celpip/MockProgress";
import { FullTestTimer } from "@/components/celpip/FullTestTimer";
import { buildComposerProps } from "@/lib/celpip/client-payload";
import type { CelpipTaskType } from "@prisma/client";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  const { sessionId } = await params;
  let session = await getSessionView(sessionId, user.id);
  if (!session) notFound();

  const full = fullTestPlanOf(session.plan);
  if (full && session.status !== "COMPLETED" && fullTestSecondsLeft(session) === 0) {
    await finishFullTest(sessionId, user.id);
    session = (await getSessionView(sessionId, user.id))!;
  }

  if (session.status === "COMPLETED") {
    return <CelpipSessionResult session={session} attempts={session.attempts} />;
  }

  const current = session.attempts.find((a) => a.sessionStep === session!.currentStep);
  if (!current) notFound();

  const def = CELPIP_TASKS[current.taskType];
  const stepLabel = full ? `Part ${session.currentStep + 1} of ${session.targetCount}` : `Step ${session.currentStep + 1} of ${session.targetCount}`;
  const isLast = session.currentStep + 1 >= session.targetCount;
  const mockPlanSteps =
    session.mode === "MOCK" ? ((session.plan as CelpipTaskType[] | null) ?? []) : [];

  async function finish() {
    "use server";
    const u = await requireUser();
    await finishFullTest(sessionId, u.id);
    redirect(`/practice/session/${sessionId}`);
  }
  const timer = full ? (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-2">
      <p className="text-sm font-semibold text-almi-ink">{full.title}</p>
      <FullTestTimer secondsLeft={fullTestSecondsLeft(session) ?? 0} finish={finish} />
    </div>
  ) : null;

  if (current.status === "SCORED") {
    async function advance() {
      "use server";
      const u = await requireUser();
      await advanceSession(sessionId, u.id);
      redirect(`/practice/session/${sessionId}`);
    }
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {timer}
        {mockPlanSteps.length > 0 && (
          <MockProgress plan={mockPlanSteps} currentStep={session.currentStep} />
        )}
        <p className="text-xs font-bold uppercase tracking-wider text-almi-text-muted">{stepLabel}</p>
        <CelpipResult def={def} item={current.item} attempt={current} variant="step" />
        <form action={advance}>
          <button
            type="submit"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep"
          >
            {isLast ? "See results →" : full ? "Next part →" : "Next step →"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {timer}
      {mockPlanSteps.length > 0 && (
        <MockProgress plan={mockPlanSteps} currentStep={session.currentStep} />
      )}
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">
          {def.label} · {stepLabel}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-almi-ink">{current.item.title}</h1>
      </header>
      <CelpipComposer
        {...buildComposerProps({
          attemptId: current.id,
          taskType: current.taskType,
          prompt: current.item.prompt,
          payload: current.item.payload,
          audioUrl: current.item.audioUrl,
        })}
      />
    </div>
  );
}
