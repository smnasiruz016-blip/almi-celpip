// Layer 3: CLB target hub (/celpip/clb-9) and CLB × origin (/celpip/clb-9/from-X).
// High-intent ("CLB 9 for Express Entry"), so honesty matters most here: a CLB is
// a goal to practise toward, never a guaranteed outcome, and the practice estimate
// is a range. No "lock in your points" language.

import type { CountryEntry } from "@/lib/celpip/seo/countries";
import type { ClbTarget } from "@/lib/celpip/seo/clb-targets";
import { PROGRAMS, IRCC_LANGUAGE_TESTS_URL, CELPIP_OFFICIAL_URL } from "@/lib/celpip/seo/programs";
import { originPathwayUrl, CELPIP_INDEX } from "@/lib/celpip/seo/urls";
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
import { clbOriginUrl } from "@/lib/celpip/seo/urls";

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

      <CountryGrid
        title={`Reaching CLB ${target.level} — by country you apply from`}
        intro="Pick your country for a page tailored to applying from there."
        hrefFor={(c) => clbOriginUrl(target, c)}
      />

      <CrossLinkFooter />
      <Disclaimer />
    </SeoShell>
  );
}

export function ClbOriginPage({
  target,
  country,
}: {
  target: ClbTarget;
  country: CountryEntry;
}) {
  return (
    <SeoShell>
      <Breadcrumb
        trail={[
          { label: "CELPIP for Canada", href: CELPIP_INDEX },
          { label: `CLB ${target.level}`, href: `/celpip/${target.slug}` },
          { label: country.name },
        ]}
      />
      <Hero
        eyebrow={`CLB ${target.level} · from ${country.name}`}
        title={`Reaching CELPIP CLB ${target.level} for Canada — from ${country.name}`}
        intro={
          <>
            Aiming for CLB {target.level} on CELPIP as you apply to Canada from {country.name}? Here is
            what the level means for your application and how to practise toward it — honestly, with no
            promises about your final score.
          </>
        }
      />

      <RequirementCard
        heading={`What CLB ${target.level} means`}
        headline={target.headline}
        detail={target.crsAngle}
        note={`Practise toward the CLB many applicants aim for — but a level is never guaranteed, and your real result comes from the official, calibrated CELPIP test. Confirm the exact requirement for your program with IRCC.`}
        links={[
          { label: "CRS criteria (IRCC)", href: CRS_URL },
          { label: "IRCC language tests", href: IRCC_LANGUAGE_TESTS_URL },
        ]}
      />

      <HonestScoringNote />

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-almi-ink">Practising toward CLB {target.level}</h2>
        <p className="mt-2 text-sm text-almi-text">
          On AlmiCELPIP you practise every CELPIP task type and get an honest CLB estimate per skill,
          shown as a range. Because CELPIP has no overall score, the way to move toward CLB{" "}
          {target.level} is to lift your weakest skill, not your average. Practise from anywhere,
          including {country.name}, before you book the real test.
        </p>
      </section>

      <SkillsGrid />

      <LinkChips
        title={`Pathways from ${country.name}`}
        links={PROGRAMS.map((p) => ({ label: p.name, href: originPathwayUrl(country, p) }))}
      />

      <CrossLinkFooter country={country} />
      <Disclaimer />
    </SeoShell>
  );
}
