// Pathway hub (/celpip/pathway/express-entry): one program's published CELPIP
// requirement plus the full A–Z of origin countries for that program.

import type { Program } from "@/lib/celpip/seo/programs";
import { PROGRAMS, IRCC_LANGUAGE_TESTS_URL, CELPIP_OFFICIAL_URL } from "@/lib/celpip/seo/programs";
import { originPathwayUrl, pathwayHubUrl, CELPIP_INDEX } from "@/lib/celpip/seo/urls";
import {
  SeoShell,
  Breadcrumb,
  Hero,
  RequirementCard,
  SkillsGrid,
  HonestScoringNote,
  LinkChips,
  CountryGrid,
  CrossLinkFooter,
  Disclaimer,
} from "./kit";

export function PathwayHub({ program }: { program: Program }) {
  const isLS = program.version === "LS";
  const others = PROGRAMS.filter((p) => p.slug !== program.slug);

  return (
    <SeoShell>
      <Breadcrumb trail={[{ label: "CELPIP for Canada", href: CELPIP_INDEX }, { label: program.name }]} />
      <Hero
        eyebrow={isLS ? "CELPIP-General LS" : "CELPIP-General"}
        title={`CELPIP for ${program.name}`}
        intro={program.summary}
      />

      <RequirementCard
        heading="The language requirement"
        headline={program.clbHeadline}
        detail={program.clbDetail}
        extra={program.skillsNote}
        note={`Requirements can change. Confirm the current requirement for ${program.name} with IRCC before you book your test.`}
        links={[
          { label: "Official IRCC page", href: program.officialUrl },
          { label: "IRCC language tests", href: IRCC_LANGUAGE_TESTS_URL },
          { label: "Official CELPIP site", href: CELPIP_OFFICIAL_URL },
        ]}
      />

      <HonestScoringNote ls={isLS} />
      <SkillsGrid ls={isLS} />

      <LinkChips
        title="Other programs that accept CELPIP"
        links={others.map((p) => ({ label: p.name, href: pathwayHubUrl(p) }))}
      />

      <CountryGrid
        title={`${program.name} — by country you apply from`}
        intro="The requirement is the same wherever you apply from. Pick your country for a tailored page."
        hrefFor={(c) => originPathwayUrl(c, program)}
      />

      <CrossLinkFooter />
      <Disclaimer />
    </SeoShell>
  );
}
