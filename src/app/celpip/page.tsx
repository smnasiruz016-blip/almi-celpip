// /celpip — the master index of the CELPIP-for-Canada SEO surface. Links into
// every layer: pathways, CLB targets, provinces, occupations, and all origins.

import type { Metadata } from "next";
import { PROGRAMS } from "@/lib/celpip/seo/programs";
import { CLB_TARGETS } from "@/lib/celpip/seo/clb-targets";
import { PROVINCES } from "@/lib/celpip/seo/provinces";
import { OCCUPATIONS } from "@/lib/celpip/seo/occupations";
import {
  pathwayHubUrl,
  clbHubUrl,
  provinceHubUrl,
  occupationHubUrl,
  originHubUrl,
} from "@/lib/celpip/seo/urls";
import {
  SeoShell,
  Hero,
  HonestScoringNote,
  SkillsGrid,
  LinkChips,
  CountryGrid,
  CrossLinkFooter,
  Disclaimer,
} from "@/components/celpip-seo/kit";

export const metadata: Metadata = {
  title: "CELPIP for Canadian immigration & citizenship",
  description:
    "Which CELPIP level each Canadian route requires — Express Entry, Provincial Nominee Programs, citizenship, by CLB target and by occupation — with honest CLB guidance and free practice. Confirm current requirements with IRCC.",
  alternates: { canonical: "/celpip" },
};

export default function Page() {
  return (
    <SeoShell>
      <Hero
        eyebrow="AlmiCELPIP"
        title="CELPIP for Canadian immigration & citizenship"
        intro="CELPIP is one of the English tests IRCC accepts. The level you need depends on your route — the program, the province, your target CLB, or your occupation. Pick a starting point below. Requirements can change, so always confirm with IRCC."
      />

      <LinkChips
        title="By immigration pathway"
        links={PROGRAMS.map((p) => ({ label: p.name, href: pathwayHubUrl(p) }))}
      />
      <LinkChips
        title="By CLB target"
        links={CLB_TARGETS.map((t) => ({ label: `CLB ${t.level}`, href: clbHubUrl(t) }))}
      />
      <LinkChips
        title="By province (Provincial Nominee Programs)"
        links={PROVINCES.map((p) => ({ label: p.name, href: provinceHubUrl(p) }))}
      />
      <LinkChips
        title="By occupation"
        links={OCCUPATIONS.map((o) => ({ label: o.name, href: occupationHubUrl(o) }))}
      />

      <HonestScoringNote />
      <SkillsGrid />

      <CountryGrid
        title="By country you apply from"
        intro="A localized CELPIP-for-Canada page for each origin country."
        hrefFor={(c) => originHubUrl(c)}
      />

      <CrossLinkFooter />
      <Disclaimer />
    </SeoShell>
  );
}
