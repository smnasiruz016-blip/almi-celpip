// Session driver: walks the user through a practice set or the full mock.
// IN_PROGRESS step → composer; SCORED step → per-step result + advance; all
// steps done → the aggregate result. Advancing is an explicit server action.

import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSessionView, advanceSession } from "@/lib/celpip/session";
import { CELPIP_TASKS } from "@/lib/celpip/registry";
import { CelpipComposer } from "@/components/celpip/composer-map";
import { CelpipResult } from "@/components/celpip/CelpipResult";
import { CelpipSessionResult } from "@/components/celpip/CelpipSessionResult";
import type { CelpipTaskType } from "@prisma/client";

// Strip any server-only answer key before sending the payload to the client.
// Objective items (Listening, Reading) keep their questions but lose the `answer`
// field; Listening audio scripts never go to the client (audio is fetched
// server-side). Writing/Speaking payloads carry no objective answer key.
function sanitizePayload(taskType: CelpipTaskType, payload: unknown): unknown {
  const p = payload as Record<string, unknown>;
  if (taskType.startsWith("LISTENING")) {
    const questions = (p.questions as { id: string; stem: string; options: unknown[] }[] | undefined) ?? [];
    // audioScript + answer stay server-side.
    return { questions: questions.map((q) => ({ id: q.id, stem: q.stem, options: q.options })) };
  }
  if (taskType.startsWith("READING")) {
    const questions = (p.questions as { id: string; stem: string; options?: unknown[] }[] | undefined) ?? [];
    return {
      passages: p.passages,
      questions: questions.map((q) => ({ id: q.id, stem: q.stem, options: q.options })),
    };
  }
  // Writing (Email/Survey) and Speaking carry no objective answer key.
  return payload;
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  const { sessionId } = await params;
  const session = await getSessionView(sessionId, user.id);
  if (!session) notFound();

  if (session.status === "COMPLETED") {
    return <CelpipSessionResult session={session} attempts={session.attempts} />;
  }

  const current = session.attempts.find((a) => a.sessionStep === session.currentStep);
  if (!current) notFound();

  const def = CELPIP_TASKS[current.taskType];
  const stepLabel = `Step ${session.currentStep + 1} of ${session.targetCount}`;
  const isLast = session.currentStep + 1 >= session.targetCount;

  if (current.status === "SCORED") {
    async function advance() {
      "use server";
      const u = await requireUser();
      await advanceSession(sessionId, u.id);
      redirect(`/practice/session/${sessionId}`);
    }
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <p className="text-xs font-bold uppercase tracking-wider text-almi-text-muted">{stepLabel}</p>
        <CelpipResult def={def} item={current.item} attempt={current} variant="step" />
        <form action={advance}>
          <button
            type="submit"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep"
          >
            {isLast ? "See results →" : "Next step →"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">
          {def.label} · {stepLabel}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-almi-ink">{current.item.title}</h1>
      </header>
      <CelpipComposer
        attemptId={current.id}
        taskType={current.taskType}
        prompt={current.item.prompt}
        payload={sanitizePayload(current.taskType, current.item.payload)}
      />
    </div>
  );
}
