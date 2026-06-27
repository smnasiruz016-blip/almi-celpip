// /celpip/province/<province> — one hub per province PNP. All 9 prebuilt.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProvinceBySlug, PROVINCE_SLUGS } from "@/lib/celpip/seo/provinces";
import { ProvinceHub } from "@/components/celpip-seo/pages-province";

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return PROVINCE_SLUGS.map((province) => ({ province }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ province: string }>;
}): Promise<Metadata> {
  const { province: slug } = await params;
  const province = findProvinceBySlug(slug);
  if (!province) return {};
  return {
    title: `CELPIP for the ${province.pnpName}`,
    description: `What CELPIP level the ${province.pnpName} asks for. PNP requirements vary by stream — honest guidance, by country, and free practice. Confirm the exact requirement with ${province.name} and IRCC.`,
    alternates: { canonical: `/celpip/province/${province.slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ province: string }> }) {
  const { province: slug } = await params;
  const province = findProvinceBySlug(slug);
  if (!province) notFound();
  return <ProvinceHub province={province} />;
}
