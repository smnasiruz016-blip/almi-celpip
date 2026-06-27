// Mock-only section progress. A full CELPIP mock runs many tasks grouped into
// skill sections (Listening → Reading → Writing → Speaking, or Listening →
// Speaking for LS). The flat "Step X of Y" alone gives no sense of which section
// you're in, so this strip shows the sections in test order with done / current /
// upcoming state and the position within the current section. Presentational only
// — derived entirely from the session plan and current step.

import { CELPIP_TASKS } from "@/lib/celpip/registry";
import { SUBTEST_LABEL } from "@/lib/celpip/types";
import type { CelpipSubTest, CelpipTaskType } from "@prisma/client";

type Section = { subTest: CelpipSubTest; start: number; count: number };

// Group the plan into consecutive same-skill sections, preserving test order.
function buildSections(plan: CelpipTaskType[]): Section[] {
  const sections: Section[] = [];
  for (let i = 0; i < plan.length; i++) {
    const subTest = CELPIP_TASKS[plan[i]].subTest;
    const last = sections[sections.length - 1];
    if (last && last.subTest === subTest) last.count += 1;
    else sections.push({ subTest, start: i, count: 1 });
  }
  return sections;
}

export function MockProgress({
  plan,
  currentStep,
}: {
  plan: CelpipTaskType[];
  currentStep: number;
}) {
  if (plan.length === 0) return null;
  const sections = buildSections(plan);
  const active = sections.find((s) => currentStep >= s.start && currentStep < s.start + s.count);

  return (
    <div className="rounded-xl border border-almi-bg-peach bg-almi-paper p-3">
      <ol className="flex flex-wrap items-center gap-2">
        {sections.map((s) => {
          const done = currentStep >= s.start + s.count;
          const isActive = active === s;
          const within = currentStep - s.start + 1;
          return (
            <li key={s.subTest}>
              <span
                className={
                  isActive
                    ? "inline-flex items-center gap-1.5 rounded-full bg-almi-coral px-3 py-1 text-xs font-semibold text-almi-ink"
                    : done
                      ? "inline-flex items-center gap-1.5 rounded-full bg-almi-teal/15 px-3 py-1 text-xs font-semibold text-almi-ink"
                      : "inline-flex items-center gap-1.5 rounded-full bg-almi-bg px-3 py-1 text-xs font-medium text-almi-text-muted"
                }
              >
                {done && (
                  <span aria-hidden className="text-almi-teal">
                    ✓
                  </span>
                )}
                {SUBTEST_LABEL[s.subTest]}
                <span className="opacity-70">
                  {isActive ? `${within}/${s.count}` : `${s.count}`}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {active && (
        <p className="mt-2 text-xs text-almi-text-muted">
          {SUBTEST_LABEL[active.subTest]} section — task {currentStep - active.start + 1} of{" "}
          {active.count}
        </p>
      )}
    </div>
  );
}
