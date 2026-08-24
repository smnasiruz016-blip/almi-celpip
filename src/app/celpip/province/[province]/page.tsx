// /celpip/province/<province> — one hub per province PNP. All 9 prebuilt.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProvinceBySlug, PROVINCE_SLUGS } from "@/lib/celpip/seo/provinces";
import { ProvinceHub } from "@/components/celpip-seo/pages-province";

export const revalidate = false; // render-once, cache until redeploy — static SEO data, no periodic ISR re-writes
// generateStaticParams below returns the COMPLETE set for this route, so every
// real URL is prebuilt at deploy and nothing renders on demand. false makes an
// unknown URL 404 instead of triggering a render + ISR cache write -- that
// on-demand write was $0.51 of a $1.08 month.
export const dynamicParams = false;

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
    description: `What CELPIP level the ${province.pnpName} asks for. PNP requirements vary by stream — honest guidance, by country, and AI-scored practice. Confirm the exact requirement with ${province.name} and IRCC.`,
    alternates: { canonical: `/celpip/province/${province.slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ province: string }> }) {
  const { province: slug } = await params;
  const province = findProvinceBySlug(slug);
  if (!province) notFound();
  return <ProvinceHub province={province} />;
}
