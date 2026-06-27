import type { Metadata } from "next";
import Link from "next/link";
import { CELPIP_TASKS } from "@/lib/celpip/registry";
import { SUBTEST_LABEL, VERSION_LABEL } from "@/lib/celpip/types";
import type { CelpipSubTest, CelpipVersion } from "@prisma/client";
import { TestimonialsSection } from "@/components/reviews/TestimonialsSection";

// Re-render hourly so newly approved testimonials appear without a redeploy.
export const revalidate = 3600;

// Homepage self-brands. `absolute` opts out of the root layout's title
// template so the brand appears exactly once.
export const metadata: Metadata = {
  title: {
    absolute: "CELPIP Practice with Honest AI Feedback on the CLB Scale | AlmiCELPIP",
  },
  description:
    "Practise CELPIP — Listening, Reading, Writing (Email + Survey) and Speaking (8 tasks) — with honest per-skill estimates on the Canadian Language Benchmark (CLB 1–12) and AI feedback. Covers CELPIP-General and CELPIP-General LS. Original material, never copied from CELPIP. $12/month, 7-day free trial.",
  openGraph: {
    title: "AlmiCELPIP — honest CELPIP practice on the CLB scale",
    description:
      "Original practice with a per-skill CLB estimate shown as a range, not an inflated number. CELPIP-General and General LS.",
  },
};

const SUBTEST_ORDER: CelpipSubTest[] = ["LISTENING", "READING", "WRITING", "SPEAKING"];
const VERSIONS: CelpipVersion[] = ["GENERAL", "LS"];

const PROMISES = [
  {
    title: "Built around the real CELPIP",
    detail:
      "Four skills in the real task formats — Listening and Reading multiple choice, a Writing Email and Survey, and eight Speaking tasks — for both CELPIP-General and General LS.",
  },
  {
    title: "Honest estimates, shown as ranges",
    detail:
      "We never invent a precise CLB. You see each skill as a CLB range with the most-likely level — because honest prep means showing the uncertainty.",
  },
  {
    title: "Original material",
    detail:
      "Every recording, passage, email task and speaking prompt is written from scratch — never copied from CELPIP.",
  },
  {
    title: "Feedback you can act on",
    detail:
      "AI feedback on Writing and Speaking points to what to fix next — against the four CELPIP criteria, constructive and never inflated.",
  },
] as const;

const PRICING_LINES = [
  "Honest AI feedback on Writing (Email + Survey) and all 8 Speaking tasks",
  "Free, auto-marked Listening and Reading practice",
  "A per-skill CLB estimate (1–12), shown as ranges, no fake composite",
  "Full mock for CELPIP-General and CELPIP-General LS",
  "Original practice material — never copied from CELPIP",
  "$12/month with a 7-day free trial, cancel anytime",
] as const;

const FAQ = [
  {
    q: "How is CELPIP scored?",
    a: "Each of the four skills (Listening, Reading, Writing, Speaking) gets its own CELPIP level, which maps one-to-one to the Canadian Language Benchmark (CLB 1–12). There is no overall or composite score. AlmiCELPIP estimates each skill from your practice and shows it as a CLB range with the most-likely level.",
  },
  {
    q: "What CLB do I need?",
    a: "It depends on your program. Express Entry and many provincial programs commonly ask for CLB 7 in each skill, while citizenship (taken as CELPIP-General LS) commonly asks for CLB 4 in Listening and Speaking. Requirements change, so always confirm the exact CLB you need with IRCC or your immigration program.",
  },
  {
    q: "What's the difference between CELPIP-General and CELPIP-General LS?",
    a: "CELPIP-General tests all four skills and is used for permanent residence. CELPIP-General LS tests only Listening and Speaking and is used for Canadian citizenship. You choose which one you're preparing for, and your full mock runs the matching skills.",
  },
  {
    q: "Is AlmiCELPIP practice copied from CELPIP?",
    a: "No. Every recording, reading passage, writing task and speaking prompt is original, written from scratch to mirror the real task types. We never copy or reproduce CELPIP's material.",
  },
  {
    q: "Is my AlmiCELPIP estimate my real CELPIP result?",
    a: "No. It's a practice estimate to guide your prep. Your real CLB comes only from an official CELPIP test — confirm the CLB you need with IRCC or your immigration program.",
  },
  {
    q: "How much does AlmiCELPIP cost?",
    a: "$12 per month with a 7-day free trial, monthly only, cancel anytime. Listening and Reading practice is free; AI feedback on Writing and Speaking is part of the subscription.",
  },
] as const;

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

// Illustrative sample — clearly labelled, never a real user, never a real CELPIP result.
const SAMPLE = [
  { name: "Listening", range: "CLB 8–10" },
  { name: "Reading", range: "CLB 7–9" },
  { name: "Writing", range: "CLB 6–8" },
  { name: "Speaking", range: "CLB 7–9" },
];

function ScoreMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="rounded-3xl border border-almi-bg-peach bg-almi-paper p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-almi-text-muted">Sample estimate</p>
          <span className="rounded-full bg-almi-bg-peach px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-almi-ink">Sample</span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {SAMPLE.map((s) => (
            <li key={s.name} className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-almi-ink">{s.name}</span>
              <span className="font-semibold text-almi-coral-deep">{s.range}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl border border-almi-bg-peach bg-almi-bg px-4 py-3">
          <p className="text-xs text-almi-text-muted">
            A CLB range per skill — never one inflated number, and no fake overall.
          </p>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-almi-text-muted">Illustrative example — not a real score.</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-almi-bg text-almi-text">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-almi-bg via-almi-bg to-almi-bg-peach px-6 pt-16 pb-20 sm:pt-20">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 z-0 h-96 w-96 rounded-full bg-almi-accent/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 z-0 h-80 w-80 rounded-full bg-almi-coral/10 blur-3xl" />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-almi-accent-deep">AlmiCELPIP · Canadian English Language Proficiency Index Program</p>
            <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.08] text-almi-ink sm:text-5xl">
              Practise the CELPIP with <span className="text-almi-coral">honest AI feedback.</span>
            </h1>
            <p className="mt-5 text-lg text-almi-text">
              Original practice for all four skills, with a per-skill estimate on the Canadian Language
              Benchmark (CLB 1–12) — so you know exactly what to work on next.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-almi-coral/30"
              >
                Practise free
              </Link>
              <Link href="/login" className="text-sm font-medium text-almi-coral hover:underline">
                Already have an account? Log in →
              </Link>
            </div>
            <p className="mt-4 text-sm text-almi-text-muted">
              $12/month, 7-day free trial, cancel anytime · Listening &amp; Reading free · Original material, never copied from CELPIP
            </p>
          </div>
          <ScoreMockup />
        </div>
      </section>

      {/* Honest hook */}
      <section className="border-t border-almi-bg-peach bg-almi-paper px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">An honest estimate, not a fake score</h2>
          <p className="mt-5 text-base text-almi-text">
            CELPIP reports a separate level for each skill, calibrated one-to-one to the Canadian
            Language Benchmark (CLB 1–12). The exact raw-to-level conversion is the test owner&apos;s and
            varies by test form — so anyone promising you a precise CLB from practice is guessing.
            AlmiCELPIP does the honest thing instead: we estimate each skill from your practice and show
            it as a CLB range with the most-likely level, relative to the CLB 7 that many programs ask for.
          </p>
          <p className="mt-4 text-base text-almi-text">
            One principle runs through it: <strong className="text-almi-ink">tell you the truth.</strong> Honest
            feedback, original material, and a clear read on what to work on next — then confirm the CLB
            you need with IRCC.
          </p>
        </div>
      </section>

      {/* Skill cards */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">The four CELPIP skills</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-almi-text-muted">
            Listening and Reading are auto-marked and free to practise. Writing and Speaking are graded
            with honest AI feedback against the four CELPIP criteria.
          </p>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {SUBTEST_ORDER.map((subTest) => {
              const parts = Object.values(CELPIP_TASKS).filter((t) => t.subTest === subTest);
              const isAi = parts.some((t) => t.scoringMode === "AI");
              return (
                <li key={subTest} className="flex h-full flex-col rounded-2xl border border-almi-bg-peach bg-almi-paper p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-semibold text-almi-ink">{SUBTEST_LABEL[subTest]}</h3>
                    <span className="text-xs text-almi-text-muted">{isAi ? "AI feedback · Pro" : "Auto-marked · Free"}</span>
                  </div>
                  <p className="mt-2 flex-1 text-sm text-almi-text">{parts[0]?.blurb}</p>
                  <span className="mt-3 text-xs text-almi-text-muted">
                    {parts.length} {parts.length === 1 ? "task" : "tasks"} · per-skill CLB estimate
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Versions: General vs LS */}
      <section className="border-t border-almi-bg-peach bg-almi-bg-peach/40 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">Two versions, one place to prepare</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-almi-text-muted">
            Choose which CELPIP you&apos;re taking and your full mock runs the matching skills.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {VERSIONS.map((v) => (
              <li key={v} className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-6">
                <h3 className="text-lg font-semibold text-almi-ink">{VERSION_LABEL[v]}</h3>
                <p className="mt-2 text-sm text-almi-text">
                  {v === "GENERAL"
                    ? "All four skills — Listening, Reading, Writing and Speaking. Used for permanent residence (Express Entry and provincial programs)."
                    : "Listening and Speaking only. Used for Canadian citizenship. Shorter, but every CLB still counts."}
                </p>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-almi-text">
            Not sure which you need?{" "}
            <Link href="/celpip-for" className="font-semibold text-almi-coral hover:underline">
              See the CELPIP requirement for each Canadian program →
            </Link>
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-almi-text-muted">
            Requirements can change — always confirm the test and CLB your program needs with IRCC.
          </p>
        </div>
      </section>

      {/* Why honest */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">Honest scoring on the CLB scale</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {PROMISES.map((p) => (
              <li key={p.title} className="flex items-start gap-3 rounded-2xl border border-almi-bg-peach bg-almi-paper p-5">
                <span aria-hidden className="mt-0.5 flex-shrink-0 select-none font-bold text-almi-teal">✓</span>
                <p className="text-sm text-almi-text">
                  <span className="font-semibold text-almi-ink">{p.title}</span>
                  {" — "}
                  {p.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-almi-bg-peach bg-almi-paper px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold text-almi-ink">Simple, honest pricing</h2>
          <p className="mt-3 text-xl font-semibold text-almi-ink">$12/month — 7-day free trial, cancel anytime.</p>
          <ul className="mx-auto mt-6 max-w-xl space-y-2 text-left text-sm text-almi-text">
            {PRICING_LINES.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 flex-shrink-0 select-none font-bold text-almi-teal">✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link href="/signup" className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep">
              Practise free
            </Link>
          </div>
          <p className="mt-4 text-sm text-almi-text-muted">
            <Link href="/pricing" className="underline hover:text-almi-ink">See full pricing</Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">Common questions</h2>
          <dl className="mt-10 space-y-6">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-2xl border border-almi-bg-peach bg-almi-bg p-6">
                <dt className="text-lg font-semibold text-almi-ink">{f.q}</dt>
                <dd className="mt-2 text-sm text-almi-text">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Testimonials (renders only when 3+ approved reviews exist) */}
      <TestimonialsSection />

      {/* Final CTA */}
      <section className="border-t border-almi-bg-peach bg-almi-paper px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold text-almi-ink">Practise honestly. Walk in ready.</h2>
          <p className="mt-3 text-base text-almi-text">
            Real CELPIP skills, honest per-skill CLB estimates, original material — for $12/month with a
            7-day free trial.
          </p>
          <div className="mt-8">
            <Link href="/signup" className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep">
              Practise free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
