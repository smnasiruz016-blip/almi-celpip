// /celpip/occupation/<occupation> — one hub per curated occupation. Prebuilt.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findOccupationBySlug, OCCUPATION_SLUGS } from "@/lib/celpip/seo/occupations";
import { OccupationHub } from "@/components/celpip-seo/pages-occupation";

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return OCCUPATION_SLUGS.map((occupation) => ({ occupation }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ occupation: string }>;
}): Promise<Metadata> {
  const { occupation: slug } = await params;
  const occupation = findOccupationBySlug(slug);
  if (!occupation) return {};
  return {
    title: `CELPIP for ${occupation.name}s moving to Canada`,
    description: `What CELPIP level a ${occupation.name.toLowerCase()} needs for Canada — the minimum comes from the program, not the job. How CLB affects your Express Entry CRS, by country, with free practice. Confirm with IRCC.`,
    alternates: { canonical: `/celpip/occupation/${occupation.slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ occupation: string }> }) {
  const { occupation: slug } = await params;
  const occupation = findOccupationBySlug(slug);
  if (!occupation) notFound();
  return <OccupationHub occupation={occupation} />;
}
