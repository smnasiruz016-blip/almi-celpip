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
  pathwayHubUrl,
  clbHubUrl,
  provinceHubUrl,
  occupationHubUrl,
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
            AI-scored practice.
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
        links={PROGRAMS.map((p) => ({ label: p.name, href: pathwayHubUrl(p) }))}
      />
      <LinkChips
        title="CLB targets"
        links={CLB_TARGETS.map((t) => ({ label: `CLB ${t.level}`, href: clbHubUrl(t) }))}
      />
      <LinkChips
        title="Provincial Nominee Programs"
        links={PROVINCES.map((pr) => ({ label: pr.name, href: provinceHubUrl(pr) }))}
      />
      <LinkChips
        title="By occupation"
        links={OCCUPATIONS.slice(0, 14).map((o) => ({
          label: o.name,
          href: occupationHubUrl(o),
        }))}
      />

      <HonestScoringNote />
      <SkillsGrid />
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
