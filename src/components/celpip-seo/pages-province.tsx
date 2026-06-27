// Layer 4: province PNP hub (/celpip/province/ontario) and province × origin
// (/celpip/province/ontario/from-X). PNP rules vary by stream, so every page is
// explicit that the level depends on the stream and defers to the province + IRCC.

import type { CountryEntry } from "@/lib/celpip/seo/countries";
import type { Province } from "@/lib/celpip/seo/provinces";
import { PROVINCES } from "@/lib/celpip/seo/provinces";
import { IRCC_LANGUAGE_TESTS_URL, CELPIP_OFFICIAL_URL } from "@/lib/celpip/seo/programs";
import { provinceHubUrl, provinceOriginUrl, CELPIP_INDEX } from "@/lib/celpip/seo/urls";
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

const PNP_INTRO =
  "Provincial Nominee Programs let a province nominate candidates for permanent residence. CELPIP-General is widely accepted, but each province runs its own streams with their own language rules.";

export function ProvinceHub({ province }: { province: Province }) {
  const others = PROVINCES.filter((p) => p.slug !== province.slug);
  return (
    <SeoShell>
      <Breadcrumb trail={[{ label: "CELPIP for Canada", href: CELPIP_INDEX }, { label: province.name }]} />
      <Hero
        eyebrow="Provincial Nominee Program"
        title={`CELPIP for the ${province.pnpName}`}
        intro={PNP_INTRO}
      />

      <RequirementCard
        heading={`${province.name} — CELPIP requirement`}
        headline="Varies by stream"
        detail={province.clbNote}
        note={`Because each stream sets its own minimum, confirm the exact requirement for the ${province.name} stream you are applying to on the province's own page and with IRCC.`}
        links={[
          { label: `${province.name} immigration`, href: province.officialUrl },
          { label: "IRCC language tests", href: IRCC_LANGUAGE_TESTS_URL },
          { label: "Official CELPIP site", href: CELPIP_OFFICIAL_URL },
        ]}
      />

      <HonestScoringNote />
      <SkillsGrid />

      <LinkChips
        title="Other provinces"
        links={others.map((p) => ({ label: p.name, href: provinceHubUrl(p) }))}
      />

      <CountryGrid
        title={`${province.name} PNP — by country you apply from`}
        intro="Pick your country for a page tailored to applying from there."
        hrefFor={(c) => provinceOriginUrl(province, c)}
      />

      <CrossLinkFooter />
      <Disclaimer />
    </SeoShell>
  );
}

export function ProvinceOriginPage({
  province,
  country,
}: {
  province: Province;
  country: CountryEntry;
}) {
  const others = PROVINCES.filter((p) => p.slug !== province.slug);
  return (
    <SeoShell>
      <Breadcrumb
        trail={[
          { label: "CELPIP for Canada", href: CELPIP_INDEX },
          { label: province.name, href: provinceHubUrl(province) },
          { label: country.name },
        ]}
      />
      <Hero
        eyebrow={`${province.name} PNP · from ${country.name}`}
        title={`CELPIP for the ${province.name} PNP — applying from ${country.name}`}
        intro={
          <>
            Applying from {country.name} through the {province.pnpName}? CELPIP-General is accepted. The
            level you need depends on the stream — here is the honest picture and free practice.
          </>
        }
      />

      <RequirementCard
        heading={`${province.name} — CELPIP requirement`}
        headline="Varies by stream"
        detail={province.clbNote}
        note={`The requirement is the same wherever you apply from, but it differs by stream. Confirm the exact level for your ${province.name} stream on the province's page and with IRCC.`}
        links={[
          { label: `${province.name} immigration`, href: province.officialUrl },
          { label: "IRCC language tests", href: IRCC_LANGUAGE_TESTS_URL },
        ]}
      />

      <HonestScoringNote />
      <SkillsGrid />

      <LinkChips
        title={`Other provinces — from ${country.name}`}
        links={others.map((p) => ({ label: p.name, href: provinceOriginUrl(p, country) }))}
      />

      <CrossLinkFooter country={country} />
      <Disclaimer />
    </SeoShell>
  );
}
