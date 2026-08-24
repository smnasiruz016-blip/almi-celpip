// Layer 3: CLB target hub (/celpip/clb-9) and CLB × origin (/celpip/clb-9/from-X).
// High-intent ("CLB 9 for Express Entry"), so honesty matters most here: a CLB is
// a goal to practise toward, never a guaranteed outcome, and the practice estimate
// is a range. No "lock in your points" language.

import type { CountryEntry } from "@/lib/celpip/seo/countries";
import type { ClbTarget } from "@/lib/celpip/seo/clb-targets";
import { PROGRAMS, IRCC_LANGUAGE_TESTS_URL, CELPIP_OFFICIAL_URL } from "@/lib/celpip/seo/programs";
import { CELPIP_INDEX } from "@/lib/celpip/seo/urls";
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

const CRS_URL =
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/criteria-comprehensive-ranking-system.html";

export function ClbHub({ target }: { target: ClbTarget }) {
  return (
    <SeoShell>
      <Breadcrumb trail={[{ label: "CELPIP for Canada", href: CELPIP_INDEX }, { label: `CLB ${target.level}` }]} />
      <Hero
        eyebrow="CLB target"
        title={`CELPIP for CLB ${target.level} — what it means for Canada`}
        intro={target.detail}
      />

      <RequirementCard
        heading={`CLB ${target.level} and your CRS score`}
        headline={target.headline}
        detail={target.crsAngle}
        note={`A CLB level is a goal to practise toward, not a guaranteed result or an invitation. Draw cut-offs and program rules change — check current CRS scores and confirm what you need with IRCC.`}
        links={[
          { label: "CRS criteria (IRCC)", href: CRS_URL },
          { label: "IRCC language tests", href: IRCC_LANGUAGE_TESTS_URL },
          { label: "Official CELPIP site", href: CELPIP_OFFICIAL_URL },
        ]}
      />

      <HonestScoringNote />
      <SkillsGrid />

      <LinkChips
        title="Programs that read your CLB"
        links={PROGRAMS.map((p) => ({ label: p.name, href: `/celpip/pathway/${p.slug}` }))}
      />

      <CrossLinkFooter />
      <Disclaimer />
    </SeoShell>
  );
}

