// Shared building blocks for every CELPIP SEO landing layer. Keeping the chrome,
// honesty notes, cross-links and disclaimers in one place means the doctrine is
// applied identically across ~13.5k pages and there is one place to change it.

import Link from "next/link";
import { COUNTRIES, originParam, type CountryEntry } from "@/lib/celpip/seo/countries";

export const FAMILY = {
  cv: "https://almicv.almiworld.com/",
  job: "https://almijob.almiworld.com/",
  study: "https://almistudy.almiworld.com/",
  pathway: "https://almipathway.almiworld.com/",
  shamool: "https://shamoolfoundation.com/",
};

export function SeoShell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">{children}</main>;
}

export function Breadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <p className="text-xs text-almi-text-muted">
      {trail.map((t, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {t.href ? (
            <Link href={t.href} className="hover:underline">
              {t.label}
            </Link>
          ) : (
            <span>{t.label}</span>
          )}
        </span>
      ))}
    </p>
  );
}

export function Hero({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
}) {
  return (
    <header className="mt-3">
      <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-almi-ink sm:text-4xl">{title}</h1>
      <p className="mt-3 text-base text-almi-text">{intro}</p>
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
  );
}

/** A requirement block with the honest "confirm with IRCC" note and source links. */
export function RequirementCard({
  heading,
  headline,
  detail,
  extra,
  note,
  links,
}: {
  heading: string;
  headline: string;
  detail: string;
  extra?: string;
  note: string;
  links: { label: string; href: string }[];
}) {
  return (
    <section className="mt-10 rounded-2xl border border-almi-coral/30 bg-almi-coral/5 p-6">
      <h2 className="text-xl font-semibold text-almi-ink">{heading}</h2>
      <p className="mt-2 text-lg font-semibold text-almi-coral-deep">{headline}</p>
      <p className="mt-2 text-sm text-almi-text">{detail}</p>
      {extra && <p className="mt-2 text-sm text-almi-text">{extra}</p>}
      <p className="mt-4 rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3 text-sm text-almi-text">
        {note}
      </p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
        {links.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="text-almi-coral hover:underline">
            {l.label} ↗
          </a>
        ))}
      </div>
    </section>
  );
}

const SKILLS_GENERAL = [
  ["Listening", "Conversations, news and discussions — answered as you listen, audio plays once."],
  ["Reading", "Correspondence, diagrams, information and opinion passages."],
  ["Writing", "An email and a survey response, with honest AI feedback on four criteria."],
  ["Speaking", "Eight short spoken tasks, graded on the words you use — never your accent."],
];
const SKILLS_LS = [
  ["Listening", "Everyday conversations and information, answered as the audio plays."],
  ["Speaking", "Short spoken tasks on familiar topics, graded on the words you use."],
];

export function SkillsGrid({ ls = false }: { ls?: boolean }) {
  const skills = ls ? SKILLS_LS : SKILLS_GENERAL;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-almi-ink">
        Practise the {ls ? "two" : "four"} skills CELPIP scores
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {skills.map(([name, blurb]) => (
          <div key={name} className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-5">
            <h3 className="text-base font-semibold text-almi-ink">{name}</h3>
            <p className="mt-1 text-sm text-almi-text">{blurb}</p>
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
  );
}

export function HonestScoringNote({ ls = false }: { ls?: boolean }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-almi-ink">An honest estimate, not a fake score</h2>
      <p className="mt-2 text-sm text-almi-text">
        CELPIP gives each skill its own level on the Canadian Language Benchmark (CLB 1–12). There is
        no single overall score — IRCC reads each skill separately, so a strong average cannot cover a
        weak skill. AlmiCELPIP shows a practice estimate as a CLB <span className="font-semibold">range</span>,
        never an inflated single number, because a practice task is not the calibrated live exam.{" "}
        {ls
          ? "CELPIP-General LS covers only listening and speaking."
          : "CELPIP-General covers all four skills."}
      </p>
    </section>
  );
}

/** Internal-link chips (programs, provinces, related pages). */
export function LinkChips({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  if (links.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-sm font-bold uppercase tracking-wider text-almi-text-muted">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full border border-almi-bg-peach bg-almi-paper px-3 py-1 text-xs font-medium text-almi-text hover:border-almi-coral"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

/** A–Z grid of all 193 origins, given a function that builds each href. */
export function CountryGrid({
  title,
  intro,
  hrefFor,
}: {
  title: string;
  intro?: string;
  hrefFor: (c: CountryEntry) => string;
}) {
  const sorted = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <section className="mt-10 border-t border-almi-bg-peach pt-6">
      <h2 className="text-xl font-semibold text-almi-ink">{title}</h2>
      {intro && <p className="mt-1 text-sm text-almi-text">{intro}</p>}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {sorted.map((c) => (
          <Link
            key={c.code}
            href={hrefFor(c)}
            className="text-sm text-almi-text hover:text-almi-coral hover:underline"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Cross-product family links + the Shamool pledge. Shown near the foot of every
 *  SEO page so the whole AlmiWorld funnel is one click away. */
export function CrossLinkFooter({ country }: { country?: CountryEntry }) {
  const fromBit = country ? ` from ${country.name}` : "";
  return (
    <section className="mt-12 rounded-2xl border border-almi-bg-peach bg-almi-paper p-6">
      <h2 className="text-base font-semibold text-almi-ink">Building a life in Canada{fromBit}?</h2>
      <p className="mt-2 text-sm text-almi-text">
        CELPIP is one step. Once you reach the CLB many applicants aim for, the rest of AlmiWorld helps
        with what comes next — all original, honest tools:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-almi-text">
        <li>
          •{" "}
          <a href={FAMILY.cv} target="_blank" rel="noopener noreferrer" className="font-semibold text-almi-coral hover:underline">
            AlmiCV
          </a>{" "}
          — build a Canadian-format resume.
        </li>
        <li>
          •{" "}
          <a href={FAMILY.job} target="_blank" rel="noopener noreferrer" className="font-semibold text-almi-coral hover:underline">
            AlmiJob
          </a>{" "}
          — find roles and see what employers ask for.
        </li>
        <li>
          •{" "}
          <a href={FAMILY.study} target="_blank" rel="noopener noreferrer" className="font-semibold text-almi-coral hover:underline">
            AlmiStudy
          </a>{" "}
          — compare Canadian programs and entry requirements.
        </li>
        <li>
          •{" "}
          <a href={FAMILY.pathway} target="_blank" rel="noopener noreferrer" className="font-semibold text-almi-coral hover:underline">
            AlmiPathway
          </a>{" "}
          — honest, dated guidance on the immigration route itself.
        </li>
      </ul>
      <p className="mt-4 text-xs text-almi-text-muted">
        AlmiWorld gives 25% of its proceeds to the{" "}
        <a href={FAMILY.shamool} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
          Shamool Foundation
        </a>
        . When AlmiCELPIP helps you, it helps families in need too.
      </p>
    </section>
  );
}

export function Disclaimer() {
  return (
    <p className="mt-10 rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3 text-xs text-almi-text-muted">
      AlmiCELPIP is original practice material and is not affiliated with or endorsed by CELPIP,
      Paragon Testing Enterprises, or Immigration, Refugees and Citizenship Canada (IRCC). We never
      copy or reproduce real CELPIP test material. CLB figures are published program guidance that can
      change — always confirm the exact requirement you need with IRCC. Practice results are an
      estimate, not an official CELPIP result.
    </p>
  );
}
