// Practice hub — the logged-in "Choose a Test" page. Lists every CELPIP task type
// from the registry grouped by skill, plus the full mock. Listening + Reading are
// free; the AI-graded Writing + Speaking and the mock need a subscription.

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CELPIP_TASKS } from "@/lib/celpip/registry";
import type { TaskDef } from "@/lib/celpip/registry";
import { SUBTEST_LABEL } from "@/lib/celpip/types";
import type { CelpipSubTest } from "@prisma/client";

const SUBTEST_ORDER: CelpipSubTest[] = ["LISTENING", "READING", "WRITING", "SPEAKING"];

function TaskCard({ def }: { def: TaskDef }) {
  const tag = def.scoringMode === "AI" ? "AI feedback · Pro" : "Auto-marked · Free";
  const inner = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-almi-ink">{def.label}</h3>
        <span className="text-xs text-almi-text-muted">{def.live ? tag : "Coming soon"}</span>
      </div>
      <p className="mt-2 text-sm text-almi-text">{def.blurb}</p>
      <p className="mt-3 text-sm font-semibold">
        {def.live ? (
          <span className="text-almi-coral">Practise →</span>
        ) : (
          <span className="text-almi-text-muted">Coming soon</span>
        )}
      </p>
    </>
  );
  return def.live ? (
    <Link
      href={`/practice/${def.slug}`}
      className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-5 shadow-sm transition hover:border-almi-accent"
    >
      {inner}
    </Link>
  ) : (
    <div className="rounded-2xl border border-almi-bg-peach bg-almi-bg p-5 opacity-80">{inner}</div>
  );
}

export default async function PracticePage() {
  await requireUser();
  const tasks = Object.values(CELPIP_TASKS);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">
          AlmiCELPIP · Canadian English Language Proficiency Index Program practice
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-almi-ink">Choose a task</h1>
        <p className="mt-2 max-w-2xl text-sm text-almi-text">
          Listening and Reading are auto-marked and free to practise. Writing and Speaking are graded
          with honest AI feedback against the four CELPIP criteria. Each skill is estimated on the
          Canadian Language Benchmark (CLB 1–12) — shown as a range, never a single number.
        </p>
      </header>

      {SUBTEST_ORDER.map((subTest) => {
        const group = tasks.filter((t) => t.subTest === subTest);
        if (group.length === 0) return null;
        return (
          <section key={subTest}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-almi-text-muted">
              {SUBTEST_LABEL[subTest]}
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((def) => (
                <TaskCard key={def.taskType} def={def} />
              ))}
            </div>
          </section>
        );
      })}

      <Link
        href="/practice/mock"
        className="block rounded-2xl border border-almi-coral/40 bg-almi-coral/10 p-6 shadow-sm transition hover:border-almi-coral"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-xl">🏁</span>
              <h2 className="text-lg font-semibold text-almi-ink">Full mock</h2>
              <span className="rounded-full bg-almi-coral px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-almi-ink">
                Pro
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm text-almi-text">
              Your CELPIP version&apos;s skills in test order, then an honest per-skill CLB estimate for
              each. No fabricated overall.
            </p>
          </div>
          <span className="text-sm font-semibold text-almi-coral">Start full mock →</span>
        </div>
      </Link>

      <p className="text-xs text-almi-text-muted">
        Every task here is written from scratch by AlmiCELPIP. We never copy or reproduce CELPIP&apos;s test
        material. Estimates are for practice, not official CELPIP results —
        confirm the CLB you need with IRCC.
      </p>
    </div>
  );
}
