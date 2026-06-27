// Program hub page (e.g. /express-entry). Overview + the published requirement,
// version-aware skill practice, and a full A–Z grid of every origin country so the
// program × origin pages are crawlable from one place. Master content; the only
// per-page variation is the program itself.

import Link from "next/link";
import { COUNTRIES, originParam } from "@/lib/celpip/seo/countries";
import {
  type Program,
  PROGRAMS,
  CELPIP_OFFICIAL_URL,
  IRCC_LANGUAGE_TESTS_URL,
} from "@/lib/celpip/seo/programs";

export function ProgramHubPage({ program }: { program: Program }) {
  const isLS = program.version === "LS";
  const versionLabel = isLS ? "CELPIP-General LS" : "CELPIP-General";
  const otherPrograms = PROGRAMS.filter((p) => p.slug !== program.slug);
  const sortedCountries = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <p className="text-xs text-almi-text-muted">
        <Link href="/celpip-for" className="hover:underline">
          CELPIP for Canadian immigration
        </Link>
      </p>

      <header className="mt-3">
        <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">
          {versionLabel}
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-almi-ink sm:text-4xl">
          CELPIP for {program.name}
        </h1>
        <p className="mt-3 text-base text-almi-text">{program.summary}</p>
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

      <section className="mt-10 rounded-2xl border border-almi-coral/30 bg-almi-coral/5 p-6">
        <h2 className="text-xl font-semibold text-almi-ink">The language requirement</h2>
        <p className="mt-2 text-lg font-semibold text-almi-coral-deep">{program.clbHeadline}</p>
        <p className="mt-2 text-sm text-almi-text">{program.clbDetail}</p>
        {program.skillsNote && <p className="mt-2 text-sm text-almi-text">{program.skillsNote}</p>}
        <p className="mt-4 rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3 text-sm text-almi-text">
          Requirements can change. Confirm the current requirement for {program.name} on the official
          IRCC page before you book your test.
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

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-almi-ink">How CELPIP is scored</h2>
        <p className="mt-2 text-sm text-almi-text">
          {versionLabel}{" "}
          {isLS
            ? "covers listening and speaking."
            : "covers all four skills — listening, reading, writing and speaking."}{" "}
          Each skill gets its own level on the Canadian Language Benchmark (CLB 1–12). There is no
          overall score — IRCC reads each skill on its own, so every skill matters.
        </p>
        <Link
          href="/signup"
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-almi-coral px-6 py-2.5 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep"
        >
          Start practising →
        </Link>
      </section>

      {/* other programs */}
      <section className="mt-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-almi-text-muted">
          Other programs that accept CELPIP
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {otherPrograms.map((p) => (
            <Link
              key={p.slug}
              href={`/${p.slug}`}
              className="rounded-full border border-almi-bg-peach bg-almi-paper px-3 py-1 text-xs font-medium text-almi-text hover:border-almi-coral"
            >
              {p.name}
            </Link>
          ))}
        </div>
      </section>

      {/* origin grid */}
      <section className="mt-10 border-t border-almi-bg-peach pt-6">
        <h2 className="text-xl font-semibold text-almi-ink">{program.name} — by country you apply from</h2>
        <p className="mt-1 text-sm text-almi-text">
          The requirement is the same wherever you apply from. Pick your country for a page tailored to
          applying from there.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {sortedCountries.map((c) => (
            <Link
              key={c.code}
              href={`/${program.slug}/${originParam(c)}`}
              className="text-sm text-almi-text hover:text-almi-coral hover:underline"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <p className="mt-10 rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3 text-xs text-almi-text-muted">
        AlmiCELPIP is original practice material and is not affiliated with or endorsed by CELPIP,
        Paragon Testing Enterprises, or IRCC. CLB figures are published program guidance that can
        change — always confirm the requirement you need with IRCC. Practice results are an estimate,
        not an official CELPIP result.
      </p>
    </main>
  );
}
