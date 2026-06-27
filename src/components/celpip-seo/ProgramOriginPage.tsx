// Program × origin SEO landing page (e.g. "CELPIP for Express Entry from Pakistan").
// Master + localized blend: the CELPIP explainer and skill content are shared
// (master); the country name, the program's requirement, and the "taking CELPIP
// from <country>" section are localized. Honesty: the CLB figure is the published
// program minimum, always shown with "confirm with IRCC" and the official link;
// nothing about the user's own score is implied. Server component — no client JS.

import Link from "next/link";
import type { CountryEntry } from "@/lib/celpip/seo/countries";
import { originParam } from "@/lib/celpip/seo/countries";
import {
  type Program,
  PROGRAMS,
  CELPIP_OFFICIAL_URL,
  IRCC_LANGUAGE_TESTS_URL,
} from "@/lib/celpip/seo/programs";

const SKILLS_GENERAL = [
  { name: "Listening", blurb: "Conversations, news, discussions — answered as you listen, audio plays once." },
  { name: "Reading", blurb: "Correspondence, diagrams, information and opinion passages." },
  { name: "Writing", blurb: "An email and a survey response, with honest AI feedback on four criteria." },
  { name: "Speaking", blurb: "Eight short spoken tasks, graded on the words you use — never your accent." },
];
const SKILLS_LS = [
  { name: "Listening", blurb: "Everyday conversations and information, answered as the audio plays." },
  { name: "Speaking", blurb: "Short spoken tasks on familiar topics, graded on the words you use." },
];

export function ProgramOriginPage({
  program,
  country,
}: {
  program: Program;
  country: CountryEntry;
}) {
  const isLS = program.version === "LS";
  const versionLabel = isLS ? "CELPIP-General LS" : "CELPIP-General";
  const skills = isLS ? SKILLS_LS : SKILLS_GENERAL;
  const otherPrograms = PROGRAMS.filter((p) => p.slug !== program.slug).slice(0, 6);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      {/* breadcrumb */}
      <p className="text-xs text-almi-text-muted">
        <Link href="/celpip-for" className="hover:underline">
          CELPIP for Canadian immigration
        </Link>{" "}
        ·{" "}
        <Link href={`/${program.slug}`} className="hover:underline">
          {program.name}
        </Link>
      </p>

      {/* hero */}
      <header className="mt-3">
        <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">
          {versionLabel} · from {country.name}
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-almi-ink sm:text-4xl">
          CELPIP for {program.name} — applying from {country.name}
        </h1>
        <p className="mt-3 text-base text-almi-text">
          If you are applying from {country.name} for {program.name.toLowerCase().startsWith("canadian") ? program.name : `the ${program.name}`},{" "}
          {versionLabel} is one of the English tests IRCC accepts. Here is the language requirement,
          how the test is scored, and free practice for the skills that count.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep"
          >
            Practise CELPIP free →
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-almi-ink/15 bg-almi-paper px-6 py-3 text-base font-semibold text-almi-ink hover:border-almi-coral"
          >
            See plans
          </Link>
        </div>
      </header>

      {/* requirement card */}
      <section className="mt-10 rounded-2xl border border-almi-coral/30 bg-almi-coral/5 p-6">
        <h2 className="text-xl font-semibold text-almi-ink">
          The {program.name} language requirement
        </h2>
        <p className="mt-2 text-lg font-semibold text-almi-coral-deep">{program.clbHeadline}</p>
        <p className="mt-2 text-sm text-almi-text">{program.clbDetail}</p>
        {program.skillsNote && (
          <p className="mt-2 text-sm text-almi-text">{program.skillsNote}</p>
        )}
        <p className="mt-4 rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3 text-sm text-almi-text">
          Requirements can change, and they are the same wherever you apply from. Always confirm the
          current requirement for {program.name} on the official IRCC page before you book your test.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          <a href={program.officialUrl} target="_blank" rel="noopener noreferrer" className="text-almi-coral hover:underline">
            Official IRCC page ↗
          </a>
          <a href={IRCC_LANGUAGE_TESTS_URL} target="_blank" rel="noopener noreferrer" className="text-almi-coral hover:underline">
            IRCC language tests ↗
          </a>
          <a href={CELPIP_OFFICIAL_URL} target="_blank" rel="noopener noreferrer" className="text-almi-coral hover:underline">
            Official CELPIP site ↗
          </a>
        </div>
      </section>

      {/* what is CELPIP (master) */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-almi-ink">How CELPIP is scored</h2>
        <p className="mt-2 text-sm text-almi-text">
          CELPIP is a computer-delivered Canadian English test. {versionLabel}{" "}
          {isLS
            ? "covers two skills — listening and speaking — which are the skills citizenship asks about."
            : "covers all four skills — listening, reading, writing and speaking."}{" "}
          Each skill gets its own level on the Canadian Language Benchmark (CLB), from 1 to 12. There
          is no single overall score: IRCC reads the CLB of each skill separately, so a strong average
          cannot make up for one weak skill.
        </p>
      </section>

      {/* taking CELPIP from country (localized) */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-almi-ink">Taking CELPIP from {country.name}</h2>
        <p className="mt-2 text-sm text-almi-text">
          CELPIP is offered at test centres in many countries and, in some places, online. Test
          availability in {country.name} can change, so check the official CELPIP site for current
          locations and dates near you. Whatever your first language, every test-taker answers the
          same tasks and is scored the same way — the {program.name} requirement above does not change
          based on the country you apply from.
        </p>
        <p className="mt-2 text-sm text-almi-text">
          What you can do from anywhere, including {country.name}, is practise the exact task types
          before you sit the real test. That is what AlmiCELPIP is for.
        </p>
      </section>

      {/* skills to practise (master, version-aware) */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-almi-ink">
          Practise the {isLS ? "two" : "four"} skills CELPIP scores
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {skills.map((s) => (
            <div key={s.name} className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-5">
              <h3 className="text-base font-semibold text-almi-ink">{s.name}</h3>
              <p className="mt-1 text-sm text-almi-text">{s.blurb}</p>
            </div>
          ))}
        </div>
        <Link
          href="/signup"
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-almi-coral px-6 py-2.5 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep"
        >
          Start practising →
        </Link>
      </section>

      {/* how AlmiCELPIP helps (honest) */}
      <section className="mt-10 rounded-2xl border border-almi-bg-peach bg-almi-paper p-6">
        <h2 className="text-xl font-semibold text-almi-ink">How AlmiCELPIP helps</h2>
        <ul className="mt-3 space-y-2 text-sm text-almi-text">
          <li>• Original practice for every CELPIP task type — never copied from the real test.</li>
          <li>• An honest CLB estimate per skill, shown as a range, not an inflated single number.</li>
          <li>
            • AI feedback on {isLS ? "speaking" : "writing and speaking"} against the four CELPIP
            criteria — judged on your language, never your accent.
          </li>
          <li>• A full {versionLabel} mock test in test order, with a per-skill estimate at the end.</li>
        </ul>
      </section>

      {/* FAQ (localized) */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-almi-ink">Common questions</h2>
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-almi-ink">
              Can I use CELPIP for {program.name} if I apply from {country.name}?
            </h3>
            <p className="mt-1 text-sm text-almi-text">
              Yes. IRCC accepts {versionLabel} for {program.name} regardless of where you apply from.
              You take the test, and your CLB result is used the same way for every applicant.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-almi-ink">
              What CELPIP level do I need for {program.name}?
            </h3>
            <p className="mt-1 text-sm text-almi-text">
              The published requirement is {program.clbHeadline.toLowerCase()}. Because requirements
              can change, confirm the current figure on the official IRCC page before booking.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-almi-ink">
              Should I take CELPIP-General or CELPIP-General LS?
            </h3>
            <p className="mt-1 text-sm text-almi-text">
              {isLS
                ? "For citizenship, take CELPIP-General LS — it covers only listening and speaking, the skills citizenship assesses."
                : "For permanent-residence programs like this one, take CELPIP-General, which covers all four skills. CELPIP-General LS is only for citizenship."}
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-almi-ink">Is AlmiCELPIP an official CELPIP test?</h3>
            <p className="mt-1 text-sm text-almi-text">
              No. AlmiCELPIP is independent practice with original material and an honest estimate. It
              is not affiliated with CELPIP, Paragon Testing, or IRCC, and its results are not an
              official CELPIP score.
            </p>
          </div>
        </div>
      </section>

      {/* internal links */}
      <section className="mt-10 border-t border-almi-bg-peach pt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-almi-text-muted">
          CELPIP for other programs — from {country.name}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {otherPrograms.map((p) => (
            <Link
              key={p.slug}
              href={`/${p.slug}/${originParam(country)}`}
              className="rounded-full border border-almi-bg-peach bg-almi-paper px-3 py-1 text-xs font-medium text-almi-text hover:border-almi-coral"
            >
              {p.name}
            </Link>
          ))}
        </div>
        <p className="mt-4 text-xs text-almi-text-muted">
          <Link href={`/${program.slug}`} className="font-semibold text-almi-coral hover:underline">
            ← {program.name}: requirement and practice for every country
          </Link>
        </p>
      </section>

      {/* disclaimer */}
      <p className="mt-10 rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3 text-xs text-almi-text-muted">
        AlmiCELPIP is original practice material and is not affiliated with or endorsed by CELPIP,
        Paragon Testing Enterprises, or Immigration, Refugees and Citizenship Canada (IRCC). CLB
        figures are published program guidance that can change — always confirm the requirement you
        need with IRCC. Practice results are an estimate, not an official CELPIP result.
      </p>
    </main>
  );
}
