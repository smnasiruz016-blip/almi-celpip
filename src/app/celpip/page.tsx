// /celpip — the index of the CELPIP-for-Canada SEO surface. Its hub link lists
// were removed in the Oct 2026 cost fix (the hubs answer 410 Gone).

import type { Metadata } from "next";
import {
  SeoShell,
  Hero,
  HonestScoringNote,
  SkillsGrid,
  CrossLinkFooter,
  Disclaimer,
} from "@/components/celpip-seo/kit";

export const metadata: Metadata = {
  title: "CELPIP for Canadian immigration & citizenship",
  description:
    "Which CELPIP level each Canadian route requires — Express Entry, Provincial Nominee Programs, citizenship, by CLB target and by occupation — with honest CLB guidance and AI-scored practice. Confirm current requirements with IRCC.",
  alternates: { canonical: "/celpip" },
};

export default function Page() {
  return (
    <SeoShell>
      <Hero
        eyebrow="AlmiCELPIP"
        title="CELPIP for Canadian immigration & citizenship"
        intro="CELPIP is one of the English tests IRCC accepts. The level you need depends on your route — the program, the province, your target CLB, or your occupation. Requirements can change, so always confirm with IRCC."
      />

      {/* The pathway, CLB, province, occupation and origin-country link lists
          were removed in the Oct 2026 cost fix: those hub pages answer 410 Gone
          (src/proxy.ts), and a kept page must not link to a removed one. */}
      <HonestScoringNote />
      <SkillsGrid />

      <CrossLinkFooter />
      <Disclaimer />
    </SeoShell>
  );
}
