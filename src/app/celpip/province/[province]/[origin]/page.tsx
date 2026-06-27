// /celpip/province/<province>/from-<country> — province × origin. On-demand ISR.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProvinceBySlug } from "@/lib/celpip/seo/provinces";
import { findCountryByOriginParam } from "@/lib/celpip/seo/countries";
import { ProvinceOriginPage } from "@/components/celpip-seo/pages-province";

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return [] as { province: string; origin: string }[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ province: string; origin: string }>;
}): Promise<Metadata> {
  const { province: pslug, origin } = await params;
  const province = findProvinceBySlug(pslug);
  const country = findCountryByOriginParam(origin);
  if (!province || !country) return {};
  return {
    title: `CELPIP for the ${province.name} PNP — from ${country.name}`,
    description: `Applying from ${country.name} through the ${province.pnpName}? CELPIP-General is accepted; the level varies by stream. Honest guidance and free practice. Confirm with ${province.name} and IRCC.`,
    alternates: { canonical: `/celpip/province/${province.slug}/${origin}` },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ province: string; origin: string }>;
}) {
  const { province: pslug, origin } = await params;
  const province = findProvinceBySlug(pslug);
  const country = findCountryByOriginParam(origin);
  if (!province || !country) notFound();
  return <ProvinceOriginPage province={province} country={country} />;
}
