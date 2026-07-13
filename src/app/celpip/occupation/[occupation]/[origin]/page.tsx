// /celpip/occupation/<occupation>/from-<country> — occupation × origin. On-demand.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findOccupationBySlug } from "@/lib/celpip/seo/occupations";
import { findCountryByOriginParam } from "@/lib/celpip/seo/countries";
import { OccupationOriginPage } from "@/components/celpip-seo/pages-occupation";

export const revalidate = false; // render-once, cache until redeploy — static SEO data, no periodic ISR re-writes
export const dynamicParams = true;

export function generateStaticParams() {
  return [] as { occupation: string; origin: string }[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ occupation: string; origin: string }>;
}): Promise<Metadata> {
  const { occupation: oslug, origin } = await params;
  const occupation = findOccupationBySlug(oslug);
  const country = findCountryByOriginParam(origin);
  if (!occupation || !country) return {};
  return {
    title: `CELPIP for ${occupation.name}s — from ${country.name}`,
    description: `Moving to Canada from ${country.name} as a ${occupation.name.toLowerCase()}? The CELPIP minimum comes from your program, not your job. How CLB affects your CRS, with free practice. Confirm with IRCC.`,
    alternates: { canonical: `/celpip/occupation/${occupation.slug}/${origin}` },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ occupation: string; origin: string }>;
}) {
  const { occupation: oslug, origin } = await params;
  const occupation = findOccupationBySlug(oslug);
  const country = findCountryByOriginParam(origin);
  if (!occupation || !country) notFound();
  return <OccupationOriginPage occupation={occupation} country={country} />;
}
