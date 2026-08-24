// Layer 5: occupation hub (/celpip/occupation/registered-nurse) and occupation ×
// origin (/celpip/occupation/registered-nurse/from-X).
//
// HONESTY anchor for the whole layer: there is NO occupation-specific CELPIP/CLB
// requirement. The language minimum is set by the immigration PROGRAM. What the
// occupation changes is which programs/TEER you qualify for, your CRS score, and
// whether your field appears in a category-based Express Entry draw (which change
// each year). Every page says this plainly and defers to IRCC.

import type { CountryEntry } from "@/lib/celpip/seo/countries";
import type { Occupation } from "@/lib/celpip/seo/occupations";
import { OCCUPATIONS, teerDescription } from "@/lib/celpip/seo/occupations";
import { PROGRAMS, IRCC_LANGUAGE_TESTS_URL, CELPIP_OFFICIAL_URL } from "@/lib/celpip/seo/programs";
import { occupationHubUrl, CELPIP_INDEX } from "@/lib/celpip/seo/urls";
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

const CATEGORY_URL =
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/works/category-based-selection.html";

function requirementDetail(o: Occupation): string {
  const base = `There is no separate CELPIP requirement for ${o.name}s — the language minimum is set by the immigration program you apply through, not by your job. For Express Entry, that is commonly CLB 7 in each skill (the Federal Skilled Worker minimum). ${o.name} is ${teerDescription(o)}, which affects which programs and streams you qualify for.`;
  if (o.eeCategory) {
    return `${base} IRCC has also run category-based Express Entry draws for ${o.eeCategory.toLowerCase()}; those categories change each year, so confirm current ones with IRCC.`;
  }
  return base;
}

const CRS_NOTE =
  "Whatever your occupation, aiming for a higher CLB (many applicants target CLB 9) adds Comprehensive Ranking System points — it does not change the minimum or guarantee an invitation.";

export function OccupationHub({ occupation }: { occupation: Occupation }) {
  const related = OCCUPATIONS.filter(
    (o) => o.field === occupation.field && o.slug !== occupation.slug,
  ).slice(0, 8);

  return (
    <SeoShell>
      <Breadcrumb trail={[{ label: "CELPIP for Canada", href: CELPIP_INDEX }, { label: occupation.name }]} />
      <Hero
        eyebrow={`${occupation.field} · for Canada`}
        title={`CELPIP for ${occupation.name}s moving to Canada`}
        intro={
          <>
            Are you a {occupation.name.toLowerCase()} planning to move to Canada? Here is how CELPIP fits
            your application — honestly. The level you need comes from the immigration program, not your
            occupation.
          </>
        }
      />

      <RequirementCard
        heading={`CELPIP for ${occupation.name}s`}
        headline="The minimum comes from the program, not the job"
        detail={requirementDetail(occupation)}
        extra={CRS_NOTE}
        note="Confirm the exact requirement for your program and check current category-based draws with IRCC. A practice estimate is a guide, not an official result."
        links={[
          { label: "Category-based selection (IRCC)", href: CATEGORY_URL },
          { label: "IRCC language tests", href: IRCC_LANGUAGE_TESTS_URL },
          { label: "Official CELPIP site", href: CELPIP_OFFICIAL_URL },
        ]}
      />

      <HonestScoringNote />
      <SkillsGrid />

      {related.length > 0 && (
        <LinkChips
          title={`Other ${occupation.field.toLowerCase()} occupations`}
          links={related.map((o) => ({ label: o.name, href: occupationHubUrl(o) }))}
        />
      )}

      <CrossLinkFooter />
      <Disclaimer />
    </SeoShell>
  );
}

