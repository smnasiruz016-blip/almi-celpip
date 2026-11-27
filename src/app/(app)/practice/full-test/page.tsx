// RR-418 · Full Listening test and Full Reading test: the real length and format (38 questions each, in the official part counts),
// timed to the official window. Listening and Reading only, so the same access as Listening and Reading practice (no AI cost).
// The existing full mock is unchanged.
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { openPractice, wouldRefusePractice } from "@/lib/billing/free-window";
import { listFullTests, startFullTest } from "@/lib/celpip/session";
import { FULL_TEST_MINUTES, OFFICIAL } from "@/lib/factory/rr418/full-tests";

async function startAction(formData: FormData) {
  "use server";
  const test = String(formData.get("test") ?? "");
  const user = await requireUser();
  const skill = test.startsWith("L") ? "LISTENING" : "READING";
  const decision = await openPractice(user, skill);
  if (!decision.allowed) redirect("/pricing");
  const id = await startFullTest(user.id, test);
  if (!id) redirect("/practice/full-test?unavailable=1");
  redirect(`/practice/session/${id}`);
}

export default async function FullTestPage({ searchParams }: { searchParams: Promise<{ unavailable?: string }> }) {
  const user = await requireUser();
  const { unavailable } = await searchParams;
  const tests = await listFullTests();
  const group = (skill: "L" | "R") => tests.filter((t) => t.skill === skill);
  const block = (skill: "L" | "R") => {
    const label = skill === "L" ? "Full Listening test" : "Full Reading test";
    const needsPaid = wouldRefusePractice(user, skill === "L" ? "LISTENING" : "READING");
    const o = OFFICIAL[skill];
    return (
      <section key={skill} className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-5">
        <h2 className="text-lg font-semibold text-almi-ink">{label}</h2>
        <p className="mt-1 text-sm text-almi-text">
          38 questions in {o.parts.length} parts ({o.parts.join(" · ")}), as in the real test. Timed: {FULL_TEST_MINUTES[skill]} minutes
          (the official window is {o.minutes.min}–{o.minutes.max} minutes, which also covers unscored questions that a practice test does not have).
          {skill === "L" ? " Each recording plays once. Part 1 comes in three sections, with its questions in between." : " Parts 1, 2 and 4 end with a second text that has blanks to choose."}
        </p>
        {group(skill).length === 0 ? (
          <p className="mt-3 text-sm text-almi-text-muted">No {label.toLowerCase()} is ready yet.</p>
        ) : needsPaid ? (
          <p className="mt-3 text-sm text-almi-text"><a href="/pricing" className="font-semibold underline">Unlock for $12/month</a> to take a full test.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {group(skill).map((t) => (
              <li key={t.test} className="rounded-xl border border-almi-bg-peach bg-almi-bg p-4">
                <p className="text-sm font-semibold text-almi-ink">{t.title}</p>
                <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-almi-text-muted">
                  {t.parts.map((p, i) => <li key={i}>{p.title.split(" — ").slice(1).join(" — ")}</li>)}
                </ol>
                <form action={startAction} className="mt-3">
                  <input type="hidden" name="test" value={t.test} />
                  <button type="submit" className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-almi-coral px-5 py-2 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep">
                    Start {t.title} →
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">AlmiCELPIP</p>
      <h1 className="text-3xl font-semibold text-almi-ink">Full-length tests</h1>
      {unavailable && <p className="rounded-xl border border-almi-coral/40 bg-almi-coral/5 px-4 py-3 text-sm text-almi-coral-text">That test is not available right now.</p>}
      {block("L")}
      {block("R")}
      <p className="text-xs text-almi-text-muted">
        Original to AlmiCELPIP — never copied from CELPIP. Results are a practice estimate, not an official Canadian English Language
        Proficiency Index Program result.
      </p>
    </div>
  );
}
