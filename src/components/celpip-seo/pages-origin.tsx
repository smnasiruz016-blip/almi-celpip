// Layer 1 + 2: the origin country hub (/celpip/from-X) and the origin × pathway
// leaf (/celpip/from-X/express-entry). The hub is the localized entry point for a
// country; the leaf carries one program's published requirement.

import Link from "next/link";
import type { CountryEntry } from "@/lib/celpip/seo/countries";
import { PROGRAMS, type Program, CELPIP_OFFICIAL_URL, IRCC_LANGUAGE_TESTS_URL } from "@/lib/celpip/seo/programs";
import { CLB_TARGETS } from "@/lib/celpip/seo/clb-targets";
import { PROVINCES } from "@/lib/celpip/seo/provinces";
import { OCCUPATIONS } from "@/lib/celpip/seo/occupations";
import {
  originHubUrl,
  originPathwayUrl,
  pathwayHubUrl,
  clbOriginUrl,
  provinceOriginUrl,
  occupationOriginUrl,
  CELPIP_INDEX,
} from "@/lib/celpip/seo/urls";
import {
  SeoShell,
  Breadcrumb,
  Hero,
  RequirementCard,
  SkillsGrid,
  HonestScoringNote,
  LinkChips,
  CrossLinkFooter,
  Disclaimer,
} from "./kit";

export function OriginHub({ country }: { country: CountryEntry }) {
  return (
    <SeoShell>
      <Breadcrumb trail={[{ label: "CELPIP for Canada", href: CELPIP_INDEX }, { label: country.name }]} />
      <Hero
        eyebrow={`Applying from ${country.name}`}
        title={`CELPIP from ${country.name} — for Canadian immigration`}
        intro={
          <>
            If you are applying to Canada from {country.name}, CELPIP is one of the English tests IRCC
            accepts for permanent residence (CELPIP-General) and citizenship (CELPIP-General LS). The
            level you need depends on the program, province or occupation — here is each route, with
            free practice.
          </>
        }
      />

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-almi-ink">CELPIP and your move from {country.name}</h2>
        <p className="mt-2 text-sm text-almi-text">
          The CELPIP test itself is the same wherever you sit it, and your Canadian Language Benchmark
          (CLB) result is read the same way for every applicant. What changes is the requirement of the
          route you choose. Test availability in {country.name} can change, so check the official CELPIP
          site for current locations and dates near you.
        </p>
      </section>

      <LinkChips
        title={`Immigration pathways — CELPIP requirement from ${country.name}`}
        links={PROGRAMS.map((p) => ({ label: p.name, href: originPathwayUrl(country, p) }))}
      />
      <LinkChips
        title="CLB targets"
        links={CLB_TARGETS.map((t) => ({ label: `CLB ${t.level}`, href: clbOriginUrl(t, country) }))}
      />
      <LinkChips
        title="Provincial Nominee Programs"
        links={PROVINCES.map((pr) => ({ label: pr.name, href: provinceOriginUrl(pr, country) }))}
      />
      <LinkChips
        title="By occupation"
        links={OCCUPATIONS.slice(0, 14).map((o) => ({
          label: o.name,
          href: occupationOriginUrl(o, country),
        }))}
      />

      <HonestScoringNote />
      <SkillsGrid />
      <CrossLinkFooter country={country} />
      <Disclaimer />
    </SeoShell>
  );
}

export function OriginPathwayPage({
  country,
  program,
}: {
  country: CountryEntry;
  program: Program;
}) {
  const isLS = program.version === "LS";
  const versionLabel = isLS ? "CELPIP-General LS" : "CELPIP-General";
  const others = PROGRAMS.filter((p) => p.slug !== program.slug);

  return (
    <SeoShell>
      <Breadcrumb
        trail={[
          { label: "CELPIP for Canada", href: CELPIP_INDEX },
          { label: country.name, href: originHubUrl(country) },
          { label: program.name },
        ]}
      />
      <Hero
        eyebrow={`${versionLabel} · from ${country.name}`}
        title={`CELPIP for ${program.name} — applying from ${country.name}`}
        intro={
          <>
            Applying from {country.name} for {program.metaName}? {versionLabel} is one of the English
            tests IRCC accepts. Here is the published requirement, how the test is scored, and free
            practice for the skills that count.
          </>
        }
      />

      <RequirementCard
        heading={`The ${program.name} language requirement`}
        headline={program.clbHeadline}
        detail={program.clbDetail}
        extra={program.skillsNote}
        note={`Requirements can change, and they are the same wherever you apply from. Confirm the current requirement for ${program.name} with IRCC before you book your test.`}
        links={[
          { label: "Official IRCC page", href: program.officialUrl },
          { label: "IRCC language tests", href: IRCC_LANGUAGE_TESTS_URL },
          { label: "Official CELPIP site", href: CELPIP_OFFICIAL_URL },
        ]}
      />

      <HonestScoringNote ls={isLS} />

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-almi-ink">Taking CELPIP from {country.name}</h2>
        <p className="mt-2 text-sm text-almi-text">
          CELPIP is offered at test centres in many countries and, in some places, online. Availability
          in {country.name} can change, so check the official CELPIP site for current locations. Whatever
          your first language, every test-taker answers the same tasks and is scored the same way — the
          {" "}
          {program.name} requirement above does not change based on where you apply from. What you can do
          from anywhere is practise the exact task types first.
        </p>
      </section>

      <SkillsGrid ls={isLS} />

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-almi-ink">Common questions</h2>
        <div className="mt-4 space-y-4">
          <Faq
            q={`Can I use CELPIP for ${program.name} if I apply from ${country.name}?`}
            a={`Yes. IRCC accepts ${versionLabel} for ${program.name} regardless of where you apply from. Your CLB result is used the same way for every applicant.`}
          />
          <Faq
            q={`What CELPIP level do I need for ${program.name}?`}
            a={`The published requirement is ${program.clbHeadline.toLowerCase()}. Because requirements can change, confirm the current figure with IRCC before booking.`}
          />
          <Faq
            q="Should I take CELPIP-General or CELPIP-General LS?"
            a={
              isLS
                ? "For citizenship, take CELPIP-General LS — it covers only listening and speaking."
                : "For permanent-residence programs like this one, take CELPIP-General, which covers all four skills. CELPIP-General LS is only for citizenship."
            }
          />
          <Faq
            q="Is AlmiCELPIP an official CELPIP test?"
            a="No. AlmiCELPIP is independent practice with original material and an honest estimate. It is not affiliated with CELPIP, Paragon Testing, or IRCC, and its results are not an official CELPIP score."
          />
        </div>
      </section>

      <LinkChips
        title={`CELPIP for other programs — from ${country.name}`}
        links={others.map((p) => ({ label: p.name, href: originPathwayUrl(country, p) }))}
      />

      <p className="mt-6 text-xs text-almi-text-muted">
        <Link href={originHubUrl(country)} className="font-semibold text-almi-coral hover:underline">
          ← All CELPIP routes from {country.name}
        </Link>{" "}
        ·{" "}
        <Link href={pathwayHubUrl(program)} className="font-semibold text-almi-coral hover:underline">
          {program.name} for every country
        </Link>
      </p>

      <CrossLinkFooter country={country} />
      <Disclaimer />
    </SeoShell>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-almi-ink">{q}</h3>
      <p className="mt-1 text-sm text-almi-text">{a}</p>
    </div>
  );
}
